# Practice Field — Claude Code Context

> Last updated: 2026-07-17 (session that built and tested the GPT-4o `/feedback` route end-to-end, fixed fault_type/line_side/position persistence, rotated OPENAI_API_KEY after accidental exposure, and fixed a production-breaking crash on the Virtual Training Coach plan page)

## Next Session Priorities

1. **Refine the `/feedback` prompt language** — the route is live and returns coherent output, but real-output review surfaced two problems worth fixing before this goes anywhere near a real coach:
   - **Hallucination risk on missing data:** a test call against a session with `position: NULL` still returned confident, specific language — `"This stance does not meet the necessary requirements for a guard or tackle..."` — inventing position-specific detail the data didn't support. The prompt needs an explicit instruction to avoid position-specific claims when `position` is null (or `line_side`/`fault_type` are null), and fall back to generic phrasing.
   - **Output shape drifted from spec:** the original plan (this doc + a separate chat session) called for a simple `summary` + `faults[]` shape. What's actually implemented in `service/feedback.py` returns a richer shape — `overall_grade`, `summary`, `issues[]` (with `issue`/`root_cause`/`severity`/`coaching_cue`/`drill_fix`), `strengths[]`, `position_context`. This isn't necessarily wrong — it's more actionable — but it's a real divergence worth a deliberate decision (keep it, simplify it, or something in between) rather than an accidental one. Also untested: whether `strengths[]` ever actually populates, or defaults to empty whenever severity is high (only tested against one bad-stance session so far).

2. **Investigate why `position` is NULL on tested sessions** — the persistence fix (this session) should write `fault_type`/`line_side`/`position` to the side-view row on `/analyse`, but the test session (`2a740dec-572e-4d42-ad52-4713a2a793f3`) had `position: NULL` despite going through `/analyse` after the fix deployed. Need to determine: is `position` actually being passed into the Inngest event / `/analyse` call from the Next.js side at all (i.e. is this a real upstream data gap — nobody records position when a coach films), or is there a bug in the persistence write itself? Check `lib/jobs/ol-stance-analysis.ts` and whatever calls it to confirm `position` is even being sent.

3. **Expand the fault taxonomy — now bigger in scope than previously framed.** Note: this was always intentionally deferred work, not a blocker discovered late. This session's goal was proving the full pipeline end-to-end (upload → measurement → feedback) works at all, even with incomplete calibration knowledge — that's now done. Good-vs-bad calibration data collection is pending and will be provided separately; the taxonomy work below depends on it and isn't expected to start until that data exists. Originally scoped as "positions beyond OL" (WR, DB, LB, QB), but this session surfaced that it's actually two separate axes:
   - **More positions** (WR, DB, LB, QB, etc.) — original scope, still fully open, no calibration rules exist beyond OL.
   - **Technique beyond stance** — the current taxonomy (`forward_lean`, `sitting_back`, `stagger`, `head_down`, `narrow_stance`) is not just OL-specific, it's *stance-specific*. Any future work on technique during a drill, rep, or movement (not just the initial stance) has no taxonomy at all, for any position, including OL.

   Additionally, `/feedback`'s current output describes faults in free text ("Hips positioned lower than shoulders") rather than mapping onto the five named fault types — worth deciding whether to enforce the taxonomy as an enum in the prompt (useful for filtering/aggregating later) or keep free text for now given the taxonomy itself is incomplete.

---

## Architecture Overview

**Stack:** Next.js 14 App Router (Vercel) · Supabase (Postgres + Auth + Storage, project ID `kzyxheyobuoqtwmdjwau`) · Python FastAPI service (Railway) · Inngest v4 (job orchestration) · Resend (transactional email) · OpenAI GPT-4o-mini (text feedback — **live as of 2026-07-17**, admin-gated)

### Two-clip OL Stance pipeline (active)

```
TwoClipUpload.tsx
  → POST /api/videos/presign × 2 (side + front clips) — consent gate, signed URL
  → PUT  <supabase-signed-url> × 2 (browser → Storage direct, bypasses Vercel)
  → POST /api/videos/confirm × 2 (insert session_videos row; second confirm fires Inngest)
  → Inngest: analysis/session.ready → ol-stance-analysis function
      step 1: validate-session (fresh DB read)
      step 2: mark-processing (both clips → 'processing')
      step 3: call-analysis-service → Railway Python service /analyse
  → Python: MediaPipe pose landmarks → aggregate_side_measurements()
  → writes RAW measurements + fault_type/line_side/position to session_videos.analysis (side-view row only)
  → front-view row: analysis_status set to 'complete', analysis stays null
```

Produces: `slope_deg_mean`, `lean_from_vertical_mean`, `detection_rate`, `reliable`, etc., plus (as of this session) persisted `fault_type`, `line_side`, `position` on the side-view row.

### GPT-4o feedback writer (`/feedback` route — live, admin-gated)

```
POST /feedback  (Python/Railway service, service/main.py)
  → gated by X-Admin-Secret header (require_admin dependency, main.py:81-85)
  → body: { "session_id": "<uuid>" }
  → looks up side-view session_videos row server-side (analysis, fault_type, line_side, position)
  → service/feedback.py: builds text-only prompt from raw measurements + fault_type/line_side/position context
  → calls gpt-4o-mini, response_format json_object
  → skips the OpenAI call and returns a fixed fallback if zero usable pose detections (won't hallucinate from nothing)
  → writes result to session_videos.feedback (JSONB, side-view row only — separate column from `analysis`, does NOT trip isStructuredAnalysis())
```

**Status:** tested end-to-end successfully on 2026-07-17 against session `2a740dec-572e-4d42-ad52-4713a2a793f3` — returned coherent, well-structured output. **Known issue:** hallucinated position-specific language despite `position` being NULL on the test row (see Next Session Priority 1). Not wired into any UI yet — output only reachable via direct API call.

**Output shape actually implemented** (differs from originally-planned simple shape):
```json
{
  "overall_grade": "D",
  "summary": "...",
  "issues": [
    { "issue": "...", "root_cause": "...", "severity": "critical", "coaching_cue": "...", "drill_fix": "..." }
  ],
  "strengths": [],
  "position_context": "..."
}
```

### Single-clip GPT-4o Vision pipeline (DISABLED 2026-07-14)

`/api/videos/analyze` and `analyzeVideoFrames()` in `lib/openai.ts` are kept for reference but no longer called. Disabled because cost was ~$0.018/call (2.5× the $0.007 target).

### VideoAnalysisCard handles both analysis shapes

`components/VideoAnalysisCard.tsx` exports `isStructuredAnalysis()` (checks for presence of the `summary` string field) to discriminate between the two `analysis`-column payloads. Now exported (was module-private) so other pages can reuse the same guard — see Gotcha #8's "bitten twice" note. **Note:** the new `feedback` column is deliberately separate from `analysis` specifically to avoid this guard — the feedback shape also has a `summary` field and would false-positive if written into `analysis`.

### Upload architecture (signed URL — critical)

Unchanged from prior session — see Gotcha #1.

### Ownership model

Unchanged — see prior session notes.

### analysis_status lifecycle (two-clip path)

Unchanged.

---

## Critical Gotchas — Do Not Re-Debug

### 1. Vercel 4.5 MB request body limit
Unchanged — see prior notes. Presign + direct-to-Storage pattern required for all uploads.

### 2. Inngest apps do NOT auto-register
Unchanged — manual sync required per environment via Inngest dashboard.

### 3. Env var changes require a fresh deploy
Unchanged — confirmed **again** this session on both Vercel and Railway. Railway does generally auto-redeploy on variable save, but always verify the deployment timestamp is after the save before testing.

### 4. Next.js App Router static caching with direct Supabase client
Unchanged — `export const dynamic = 'force-dynamic'` required on pages reading live data.

### 5. supabase-py 2.31.0 + sb_secret_ key format
Unchanged — Authorization-header fix in `service/main.py` `get_supabase()` still required.

### 6. Resend sandbox domain restricts delivery
Unchanged — still unresolved, FROM address still `onboarding@resend.dev`.

### 7. Python service: analysis written to side-view row only
Unchanged — same convention now applies to the new `feedback` column.

### 8. session_videos.analysis column holds two incompatible shapes
Unchanged. **Extended this session:** `feedback` is a *third*, separate JSONB column specifically to avoid a shape collision with `isStructuredAnalysis()` — do not write feedback output into `analysis`.

**This gotcha has now bitten twice.** Originally the guard was applied only in `VideoAnalysisCard.tsx`. On 2026-07-17 it was found that `app/[coachId]/players/[playerId]/plan/page.tsx` read `analysis.issues.sort(...)` with no guard, throwing a `TypeError` on the raw-measurement shape (which has no `issues` key). Because `load()` had no try/catch, `setLoading(false)` never ran and the page hung silently on "Loading…" forever — in production, for essentially every player, since every two-clip session produces the raw shape. Fixed by exporting `isStructuredAnalysis()` from `VideoAnalysisCard.tsx` and applying it in the plan page, plus wrapping `load()` in try/catch/finally so any future error surfaces instead of hanging silently. Verified against two players locally (session `2a740dec-572e-4d42-ad52-4713a2a793f3`'s player, and the "john" / `FG8Q7KLS2` player who originally reproduced the production hang) — both load correctly now. **Any code that reads the `analysis` field MUST apply `isStructuredAnalysis()` first** — treat this as a hard rule, not a suggestion. See the outstanding audit item below.

### 9. NEW — API keys pasted with embedded newlines break outbound HTTP calls
`OPENAI_API_KEY` on Railway was originally pasted with a literal newline character embedded mid-string (likely from a password manager or notes app that appended a trailing line break on copy). This produced `httpcore.LocalProtocolError: Illegal header value` on every OpenAI call — surfaced misleadingly as a generic `openai.APIConnectionError: Connection error` at the top level, which sent debugging down the wrong path (DNS/SSL) for a while before the real cause was found in the full traceback.

**Fix applied:** rotated to a new OpenAI key, re-pasted carefully (verified as a single line via a throwaway shell variable before pasting into Railway/Vercel), old key revoked on OpenAI's dashboard.

**When pasting any secret into Railway/Vercel/anywhere:** paste into a plain-text scratch variable first (e.g. `$test = "..."` in PowerShell, or any text editor) and visually confirm it's one continuous line with no line break before saving it as an env var.

### 10. NEW — Railway/Vercel deploys can silently fail during a GitHub outage
Encountered a real (brief) GitHub outage on 2026-07-16 that blocked both Vercel and Railway from pulling new commits, surfacing as a generic Vercel dashboard `502 Unexpected error`. Vercel's dashboard shows a "GitHub Outage" banner when this is the cause — check for it before assuming a deploy failure is project-specific. Resolved on its own within the same session once GitHub recovered; no project-side fix needed.

---

## What Was Fixed This Session (2026-07-17)

- **`fault_type`/`line_side`/`position` persistence** — previously passed to `/analyse` via the Inngest event but never written to the DB (noted as a gap in the prior session). Now persisted to the side-view row in `service/main.py`. **Caveat:** confirmed the column now exists and is written to, but the one tested session still showed `position: NULL` — root cause not yet confirmed (upstream data gap vs. a remaining bug). See Next Session Priority 2.
- **GPT-4o `/feedback` route built and tested end-to-end** — `POST /feedback` on the Python/Railway service (`service/main.py`, `service/feedback.py`), admin-gated via its own `X-Admin-Secret` (separate from `/analyse`'s `X-Service-Secret`). Tested successfully against a real session; output is coherent but has known issues (see Priority 1).
- **New migration applied:** `supabase/migration-v10-feedback-column.sql` — adds `feedback` JSONB column to `session_videos`, deliberately separate from `analysis`.
- **New env vars set (Railway):** `OPENAI_API_KEY`, `ADMIN_SECRET` — both required for `/feedback` to function.
- **OPENAI_API_KEY rotated** on both Vercel and Railway after the old key was exposed with an embedded newline (see Gotcha #9). Old key revoked on OpenAI's dashboard.
- **Note:** `ADMIN_SECRET` value was also visible in a debugging screenshot during this session (PowerShell terminal output shown to get help). Low real-world risk (gates only the `/feedback` admin route, no financial exposure), but **should be regenerated** before considering this fully closed out — not yet done as of this doc update.
- **Production-breaking crash fixed on the Virtual Training Coach plan page** — `app/[coachId]/players/[playerId]/plan/page.tsx` crashed on load for essentially every player (see Gotcha #8's "bitten twice" note) because it read `analysis.issues` without the `isStructuredAnalysis()` guard. Symptom in production: page stuck on "Loading…" forever, no error shown, because the resulting `TypeError` was thrown outside any try/catch and `setLoading(false)` never ran. Fixed by exporting the guard and applying it, plus adding try/catch/finally around the page's data load.
- **Git history:** four commits, in order — `fix: persist fault_type/line_side/position on /analyse write`, `feat: add /feedback route for GPT-4o stance feedback`, `chore: untrack __pycache__` (plus a `.gitignore` addition for `__pycache__/` and `*.pyc`), `fix: guard plan page against raw-measurement analysis shape and silent load failures`.

---

## What's Still Outstanding

**AUDIT: find any other unguarded `analysis` reads** — Gotcha #8 has now caused a real production hang twice (`VideoAnalysisCard`, then the plan page). Both known spots are fixed, but if two places missed the `isStructuredAnalysis()` guard, a third may exist. Do a repo-wide search for every place the `analysis` field is read/dereferenced and confirm each applies the guard before touching shape-specific fields like `.issues`, `.summary`, `.scores`, `.plan`. Low effort, high value — prevents the next silent hang.

**`/feedback` prompt refinement** — see Next Session Priority 1. Hallucination on null position data is the most urgent piece; output shape divergence from original plan needs a deliberate decision.

**Why is `position` NULL on tested sessions** — see Next Session Priority 2.

**Fault taxonomy — now understood to be two axes, not one** — see Next Session Priority 3. Positions beyond OL, *and* technique beyond stance, both need calibration rules from scratch.

**`ADMIN_SECRET` should be rotated** — exposed in a debugging screenshot this session (see "What Was Fixed" above). Not done yet.

**`/feedback` not wired into any UI** — deliberately, per the original dev/admin-only gate. Revisit once prompt quality (Priority 1) is settled.

**Resend custom domain** — unchanged, still outstanding. All transactional emails send from `onboarding@resend.dev`.

**Front-view biomechanical analysis** — unchanged, still skipped entirely by the Python service.

**`supabase/migration-v3-drills-feedback.sql` unapplied, safe to delete** — unchanged from prior session. Unrelated to the new `migration-v10-feedback-column.sql`, which *has* been applied.

**`getOrCreateCoach()` can create coach with no consent trail** — unchanged, still open.

**Session list ordering on player detail page lacks clear timestamp indication** — unchanged, low priority.

---

## Key File Reference

| File | Purpose |
|---|---|
| `service/main.py` | Python analysis service: FastAPI endpoints, MediaPipe processing, Supabase writes, sb_secret_ fix, **`/feedback` route (new)**, `require_admin` dependency |
| `service/feedback.py` | **New.** Builds the GPT-4o-mini prompt from raw measurements + fault_type/line_side/position, calls OpenAI, returns structured feedback. Zero-detection fallback guard. |
| `service/pose_utils.py` | MediaPipe pose landmark extraction, side-view slope calculation |
| `service/measurements.py` | `aggregate_side_measurements()` — filters frames, computes slope stats |
| `supabase/migration-v10-feedback-column.sql` | **New, applied.** Adds `feedback` JSONB column to `session_videos`. |
| `app/api/videos/presign/route.ts` | Step 1 of upload: consent gate + signed URL issuance |
| `app/api/videos/confirm/route.ts` | Step 2 of upload: DB row insert + paired-clip check + Inngest fire |
| `app/api/videos/upload/route.ts` | **Deprecated** — no longer called, kept for reference |
| `app/api/videos/analyze/route.ts` | **Deprecated 2026-07-14** — single-clip GPT-4o vision; kept for reference |
| `lib/openai.ts` | OpenAI client (Next.js side); `generateTrainingPlanAI()` (active); `analyzeVideoFrames()` (deprecated) |
| `lib/inngest.ts` | Inngest client, app ID `practice-field` |
| `lib/jobs/ol-stance-analysis.ts` | Inngest function: validates session, marks processing, calls Python /analyse — **check here first for Priority 2 (position NULL investigation)** |
| `lib/server-frames.ts` | **Deprecated 2026-07-14** — FFmpeg frame extraction for single-clip path; kept for reference |
| `components/VideoAnalysisCard.tsx` | Renders both structured VideoAnalysis and raw Python measurements via `isStructuredAnalysis()` (now exported — reused by the plan page, see Gotcha #8). Does not yet render the new `feedback` column — not wired into UI. |
| `components/VideoUpload.tsx` | **Deprecated 2026-07-14** — single-clip upload UI; no longer rendered |
| `components/TwoClipUpload.tsx` | Two-clip OL stance upload UI: presign → Storage PUT → confirm (×2) |
| `app/[coachId]/players/[playerId]/sessions/[sessionId]/page.tsx` | Session results page — `force-dynamic`, fetches videos, renders VideoAnalysisCard per drill |
| `app/[coachId]/players/[playerId]/plan/page.tsx` | Virtual Training Coach plan builder. **Fixed 2026-07-17** — crashed for essentially every player reading `analysis.issues` without `isStructuredAnalysis()`; see Gotcha #8. |
| `app/[coachId]/players/[playerId]/videos/page.tsx` | Coach video library + upload tab (two-clip only as of 2026-07-14) |
| `app/api/inngest/route.ts` | Inngest serve endpoint — must be synced manually in Inngest dashboard after deploy |
| `types/index.ts` | `VideoAnalysis`, `SessionVideo` (includes `view_angle`), `AnalysisStatus` — **does not yet include a `feedback` field on the SessionVideo type; add when wiring into UI** |
| `service/Dockerfile` | Railway container — includes libgles2/libegl1, wget for model, ENV MODEL_PATH |
| `service/requirements.txt` | Pinned exact versions (mediapipe==0.10.35, supabase==2.31.0, openai==1.59.6, etc.) |

## Environment Variables (complete list)

**Vercel (Next.js app):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `sb_publishable_...` format
- `SUPABASE_SERVICE_ROLE_KEY` — `sb_secret_...` format
- `OPENAI_API_KEY` — **rotated 2026-07-17** (old key had been pasted with an embedded newline, causing header errors; rotated as a precaution after exposure — see Gotcha #9)
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL` — bare origin, no trailing slash
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `ANALYSIS_SERVICE_URL`
- `ANALYSIS_SERVICE_SECRET`

**Railway (Python service):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — `sb_secret_...` format; Authorization-header fix required
- `SUPABASE_STORAGE_BUCKET` — value: `session-videos`
- `SERVICE_SECRET` — shared secret matching `ANALYSIS_SERVICE_SECRET` on Vercel, gates `/analyse`
- `MEDIAPIPE_MODEL_PATH` — set by Dockerfile
- `OPENAI_API_KEY` — **new this session.** Same rotated key as Vercel's. Gates the actual OpenAI call inside `/feedback`.
- `ADMIN_SECRET` — **new this session.** Gates the `/feedback` route via `require_admin`. Separate trust boundary from `SERVICE_SECRET` — this one is for manual/admin calls, not Vercel→Railway automation. **Should be rotated** — was visible in a debugging screenshot this session, not yet done.

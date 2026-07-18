# Practice Field — Claude Code Context

> Last updated: 2026-07-17 (session that built and tested the GPT-4o `/feedback` route end-to-end, fixed fault_type/line_side/position persistence, rotated OPENAI_API_KEY after accidental exposure, wired `/feedback` output into the session results page, hid raw pose measurements from athletes, fixed a production-breaking crash on the Virtual Training Coach plan page, fixed the null-data hallucination bug, made feedback generation automatic, removed the letter grade from feedback, made the session results page auto-refresh on completion, and built hard-delete for players/sessions after discovering the existing DELETE routes had zero ownership checks)

## Next Session Priorities

1. **Run the live end-to-end verification for auto-generated feedback** — Phase 2 (auto-trigger) is implemented and unit/logic-verified (see "What Was Fixed"), but the one check that genuinely requires the live deployed stack — upload a fresh two-clip session through the real app and confirm `feedback` populates automatically with zero manual curl calls — has not been run yet. Do this before treating auto-generation as fully proven. Also worth re-triggering `/analyse` on an already-uploaded clip (real `storage_path` values exist from prior test sessions) as a cheaper alternative to a brand-new upload if that's easier.

2. **Investigate why `position` is NULL on some tested sessions** — still open, still exactly as scoped before. Note: this is now lower-stakes than it was — the 2026-07-17 hedging fix (see below) makes a NULL position *safe* to serve (no more invented "guard or tackle" language), it just doesn't explain *why* it's null on some rows and not others (compare `2a740dec-...`, NULL, vs `2a525837-...`, correctly populated — both went through `/analyse` after the persistence fix). Check `lib/jobs/ol-stance-analysis.ts` and whatever calls it to confirm `position` is actually being sent from the Next.js side.

3. **`/feedback` output shape — partially decided.** The original plan (this doc + a separate chat session) called for a simple `summary` + `faults[]` shape; what's implemented returns a richer shape (`summary`, `issues[]`, `strengths[]`, `position_context`). The owner has explicitly decided `overall_grade` isn't wanted (removed 2026-07-17 — see below), so that piece of the divergence is now resolved. The rest (`issues[]` vs. simple `faults[]`) is still an open, undecided divergence. Also still untested: whether `strengths[]` ever actually populates, or defaults to empty whenever severity is high.

4. **Expand the fault taxonomy — now bigger in scope than previously framed.** Note: this was always intentionally deferred work, not a blocker discovered late. Good-vs-bad calibration data collection is pending and will be provided separately; the taxonomy work below depends on it and isn't expected to start until that data exists. Originally scoped as "positions beyond OL" (WR, DB, LB, QB), but turned out to be two separate axes:
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

### GPT-4o feedback writer — now generates automatically (as of 2026-07-17)

```
Auto-trigger (new): inside POST /analyse, immediately after the side-view row's
  analysis is written — same process, uses the measurements/fault_type/line_side/
  position already in memory, no re-fetch or extra network hop.
  → best-effort, wrapped in try/except: an OpenAI failure is logged and swallowed,
    never affects the analysis write (which already succeeded above it) or the
    front-view write (which happens after it)
  → skipped entirely (not even the zero-detection fallback) when there's no usable
    pose data — feedback just stays null, same as the existing "feedback pending" UI state

Manual (unchanged): POST /feedback  (Python/Railway service, service/main.py)
  → gated by X-Admin-Secret header (require_admin dependency)
  → body: { "session_id": "<uuid>" }
  → still works for re-generating feedback on any session (e.g. after a prompt change)

Both paths converge on the same service/feedback.py:
  → build_prompt()/generate_feedback() build a text-only prompt from raw measurements +
    fault_type/line_side/position — each of the three is Optional; None gets an explicit
    "this is UNKNOWN, do not guess/name/imply a value" instruction rather than being
    silently substituted with a default (see the 2026-07-17 hedging fix below)
  → calls gpt-4o-mini, response_format json_object
  → writes result to session_videos.feedback (JSONB, side-view row only — separate
    column from `analysis`, does NOT trip isStructuredAnalysis())
```

**Hedging fix (2026-07-17):** the real root cause of the hallucination issue was in `main.py`, not the prompt — the `/feedback` route coerced NULL `fault_type`/`line_side`/`position` to concrete fallback values (e.g. NULL `position` → the literal string `"guard_tackle"`) *before* `feedback.py` ever saw them, so the model never actually knew data was missing. Fixed by passing `None` through as-is and adding explicit UNKNOWN cues in `feedback.py`. Verified live against both sessions from the original report: `2a525837-...` (`position: guard_tackle`) still gets grounded position language in `position_context`; `2a740dec-...` (`position: NULL`) now produces zero mentions of guard/tackle/center anywhere in the output.

**Auto-generation (2026-07-17):** implemented and logic-verified (bad-key failure confirmed caught, doesn't affect the analysis write), but the live end-to-end check — a real upload through the deployed app, confirming `feedback` populates with no manual curl call — hasn't been run yet. See Next Session Priority 1.

**Wired into the UI** — `components/FeedbackCard.tsx` renders the `feedback` column on the session results page, alongside `VideoAnalysisCard`. Sessions without feedback yet (auto-generation failed, or predate this change) still show the "feedback pending" placeholder. `components/SessionAutoRefresh.tsx` (new, 2026-07-17) polls via `router.refresh()` while analysis is in progress so the page updates on its own once feedback lands — no more navigate-away-and-back. Stops on `complete`/`failed`, with one grace poll after `complete` to catch feedback arriving a moment later.

**Letter grade removed (2026-07-17)** — owner decision: `overall_grade` wasn't wanted, only the written note. Removed from generation (`service/feedback.py`), the `StanceFeedback` type, and the `FeedbackCard` badge — not just hidden. `OverallGrade` the TS type still exists (shared with the separate, deprecated `VideoAnalysis` shape). Old stored `feedback` rows that still have `overall_grade` are harmless — nothing reads it anymore.

**Output shape actually implemented** (differs from originally-planned simple shape; no `overall_grade` as of 2026-07-17 — see below):
```json
{
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

**Raw pose measurements no longer shown to end users (2026-07-17).** The card used to render the raw MediaPipe measurement dump (`slope_deg_mean`, `detection_rate`, etc.) whenever a video had `analysis_status: 'complete'` but no structured analysis. That block was removed — it's internal debugging data, not something a coach or athlete needs. Replaced with a simple `"✓ Analysis complete — feedback pending"` message for the common case where `/feedback` hasn't been triggered yet.

### FeedbackCard renders the /feedback output

`components/FeedbackCard.tsx` — new, separate from `VideoAnalysisCard`/`isStructuredAnalysis()` since it reads the `feedback` column directly (no shape-collision risk). Renders grade badge, summary, issues (severity-styled to match `VideoAnalysisCard`'s dark theme), strengths, `position_context`, and a caveat banner noting the known hallucination issue (Priority 1). Returns `null` when `feedback` is null, so it's safe to render unconditionally for every side-view video. Wired into `app/[coachId]/players/[playerId]/sessions/[sessionId]/page.tsx` alongside `VideoAnalysisCard`.

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

### 10. Railway/Vercel deploys can silently fail during a GitHub outage
Encountered a real (brief) GitHub outage on 2026-07-16 that blocked both Vercel and Railway from pulling new commits, surfacing as a generic Vercel dashboard `502 Unexpected error`. Vercel's dashboard shows a "GitHub Outage" banner when this is the cause — check for it before assuming a deploy failure is project-specific. Resolved on its own within the same session once GitHub recovered; no project-side fix needed.

### 11. NEW — `DELETE` routes existed with zero ownership checks before 2026-07-17
`DELETE /api/players/[playerId]` and `DELETE /api/sessions/[sessionId]` both pre-dated this session and had **no ownership verification at all** — any caller who knew an id could delete any coach's player or session, and neither route touched Supabase Storage, silently orphaning every video file the row referenced. Discovered while building the hard-delete feature (build spec explicitly required ownership checks and storage-first cleanup); both routes were rewritten in place rather than left as dead insecure code. **If any other `DELETE`/mutating route is found that was written before this audit, assume it needs the same review** — verify ownership against a fresh DB read (never trust a client-supplied `coach_id`), and confirm it doesn't silently orphan Storage objects.

### 12. NEW — `ON DELETE SET NULL` doesn't bypass an append-only `BEFORE UPDATE` trigger
`consent_records` is append-only via `trg_consent_no_update` (`prevent_consent_update()`), which unconditionally rejects every `UPDATE`. Postgres implements a foreign key's `ON DELETE SET NULL` action as a real `UPDATE` on the referencing row — so simply changing `consent_records_player_id_fkey` from `CASCADE` to `SET NULL` (migration-v11) was **not sufficient by itself**; the trigger blocked the FK's own cascade, and deleting a player with any consent records failed outright with `"consent_records is append-only"`. Verified this failure live against a disposable test player before fixing it. Fix: the trigger function needed a narrow carve-out permitting only the exact shape of that one update (`player_id` transitioning to `NULL`, every other column unchanged) — see migration-v11's second `CREATE OR REPLACE FUNCTION`. **Any future FK pointing at an append-only/trigger-protected table needs the same check** — a constraint-level fix alone is not enough to verify; test the actual cascade against real data.

---

## What Was Fixed This Session (2026-07-17)

- **`fault_type`/`line_side`/`position` persistence** — previously passed to `/analyse` via the Inngest event but never written to the DB (noted as a gap in the prior session). Now persisted to the side-view row in `service/main.py`. **Caveat:** confirmed the column now exists and is written to, but the one tested session still showed `position: NULL` — root cause not yet confirmed (upstream data gap vs. a remaining bug). See Next Session Priority 2.
- **GPT-4o `/feedback` route built and tested end-to-end** — `POST /feedback` on the Python/Railway service (`service/main.py`, `service/feedback.py`), admin-gated via its own `X-Admin-Secret` (separate from `/analyse`'s `X-Service-Secret`). Tested successfully against a real session; output is coherent but has known issues (see Priority 1).
- **New migration applied:** `supabase/migration-v10-feedback-column.sql` — adds `feedback` JSONB column to `session_videos`, deliberately separate from `analysis`.
- **New env vars set (Railway):** `OPENAI_API_KEY`, `ADMIN_SECRET` — both required for `/feedback` to function.
- **OPENAI_API_KEY rotated** on both Vercel and Railway after the old key was exposed with an embedded newline (see Gotcha #9). Old key revoked on OpenAI's dashboard.
- **Note:** `ADMIN_SECRET` value was also visible in a debugging screenshot during this session (PowerShell terminal output shown to get help). Low real-world risk (gates only the `/feedback` admin route, no financial exposure), but **should be regenerated** before considering this fully closed out — not yet done as of this doc update.
- **Production-breaking crash fixed on the Virtual Training Coach plan page** — `app/[coachId]/players/[playerId]/plan/page.tsx` crashed on load for essentially every player (see Gotcha #8's "bitten twice" note) because it read `analysis.issues` without the `isStructuredAnalysis()` guard. Symptom in production: page stuck on "Loading…" forever, no error shown, because the resulting `TypeError` was thrown outside any try/catch and `setLoading(false)` never ran. Fixed by exporting the guard and applying it, plus adding try/catch/finally around the page's data load.
- **`/feedback` output wired into the UI** — `StanceFeedback`/`StanceFeedbackIssue` types added to `types/index.ts` (matching what `service/feedback.py` actually returns: `severity` is `critical|high|medium|low` reusing `IssueSeverity`, `strengths` are `{strength, evidence}` objects reusing `TechniqueStrength` — not the guessed-at shapes from an early outside-the-repo draft). New `components/FeedbackCard.tsx` renders it. Wired into the session results page alongside `VideoAnalysisCard`. Verified live against a real session, dark-theme styling consistent with the rest of the app.
- **Raw pose measurements hidden from `VideoAnalysisCard`** — internal MediaPipe debugging data (slope angles, detection rate) has no business being shown to a coach or athlete; replaced with a "feedback pending" placeholder for the common not-yet-triggered case.
- **Null-data hallucination bug fixed (Phase 1 of the auto-feedback build)** — root cause was in `main.py`, not the prompt: the `/feedback` route coerced NULL `fault_type`/`line_side`/`position` to concrete fallback values (NULL `position` → `"guard_tackle"`) before `feedback.py` ever saw them. `main.py` now passes `None` through; `feedback.py` adds explicit "this is UNKNOWN, do not guess" cues for each of the three. Verified live against both sessions from the original bug report — the NULL-position session now produces zero mentions of guard/tackle/center anywhere in the output, where it previously invented them.
- **Feedback generation made automatic (Phase 2)** — `POST /analyse` now calls `generate_feedback()` in-process right after writing the side-view analysis, using the already-in-memory measurements/context (no re-fetch). Best-effort: wrapped in try/except so an OpenAI failure never affects the analysis write or the front-view write. Skipped entirely on zero-detection clips (nothing useful to auto-write). The manual `POST /feedback` route is unchanged and still works for re-generation. **Not yet verified end-to-end against the live deployed stack** — see Next Session Priority 1.
- **Letter grade removed from feedback** — owner decision, not a bug fix: `overall_grade` wasn't wanted. Removed from `service/feedback.py` (prompt schema + zero-detection fallback + the now-unused `GRADE_RUBRIC`), `StanceFeedback` in `types/index.ts`, and the badge in `FeedbackCard.tsx`. `OverallGrade` the type stays — `VideoAnalysis` still uses it. Verified with a live `generate_feedback()` call that the key is genuinely gone from output, and that the card renders with no layout gap, including against a session whose *stored* feedback still has the old field (harmless, per the build spec's own note — nothing reads it anymore).
- **Session results page now auto-refreshes on completion** — new `components/SessionAutoRefresh.tsx`, a client island that calls `router.refresh()` on an interval while any side video's `analysis_status` hasn't reached `complete`/`failed`. Coaches previously had to navigate away and back to see feedback appear. Stops on `failed`; treats `complete` as terminal even with feedback still null (best-effort generation can simply fail — polling forever for it would never stop), but allows exactly one grace poll after first observing `complete` to catch feedback landing a couple seconds later (it's generated inline in `/analyse`, right after the analysis write). Capped at 40 polls (~4 min) as a safety net. **Verified against the live DB**, not just typechecked: temporarily flipped a real test row through processing → complete-without-feedback → complete-with-feedback and confirmed (via console instrumentation) refresh fires while processing, fires exactly once during the grace window, and stays silent once genuinely done — then restored the row to its original state.
- **Hard-delete built for players and sessions** — `DELETE /api/players/[playerId]` and `DELETE /api/sessions/[sessionId]` both **already existed** with zero ownership checks and no Storage cleanup (see Gotcha #11) — rewritten in place rather than adding new routes. Both now: verify ownership against a fresh DB read of `coach_id` (403 if it doesn't match, every query additionally scoped by `coach_id` for defense in depth), gather every video's `storage_path` and delete the Storage objects *before* touching any DB row (storage-first — a storage failure aborts before any DB row is touched; a DB failure after a successful storage delete is logged clearly, not swallowed), then delete `session_videos` → `sessions` → (player route only) the `players` row. `consent_records` are never touched by either route — migration-v11's FK fix (see Gotcha #12) makes retention automatic. New `components/DeleteSessionButton.tsx`/`DeletePlayerButton.tsx`, plain `window.confirm()` naming what's being deleted, wired into the session and player detail pages. **Verified against the live DB and the live Storage bucket** (not just typechecked or DB-checked): built real test fixtures with files actually uploaded to Storage, confirmed cross-coach delete attempts are refused (403) with nothing touched, confirmed real deletes remove every DB row *and* every Storage file (checked via direct Storage API calls — deleted objects genuinely 404, a bucket list on the test prefix returned empty), and confirmed the player-delete test's consent record survived with `player_id` nulled. All disposable test data cleaned up afterward.
- **Git history:** fifteen commits this session, in order — `fix: persist fault_type/line_side/position on /analyse write`, `feat: add /feedback route for GPT-4o stance feedback`, `chore: untrack __pycache__` (`.gitignore` addition for `__pycache__/`/`*.pyc`), `docs: refresh CLAUDE.md for 2026-07-17 session`, `feat: render /feedback output in session results page`, `chore: add dev server launch config for browser preview tooling`, `feat: hide raw pose measurements from VideoAnalysisCard`, `fix: guard plan page against raw-measurement analysis shape and silent load failures`, `fix: stop hedging failure on null fault_type/line_side/position in /feedback`, `feat: auto-generate feedback inline after /analyse completes`, `feat: remove letter grade from feedback`, `feat: auto-refresh session page on analysis completion`, `fix: retain consent_records when a player is hard-deleted`, `feat: hard-delete video sessions with storage-first cleanup`, `feat: hard-delete players with cascading cleanup and ownership checks`.

---

## What's Still Outstanding

**AUDIT: find any other unguarded `analysis` reads** — Gotcha #8 has now caused a real production hang twice (`VideoAnalysisCard`, then the plan page). Both known spots are fixed, but if two places missed the `isStructuredAnalysis()` guard, a third may exist. Do a repo-wide search for every place the `analysis` field is read/dereferenced and confirm each applies the guard before touching shape-specific fields like `.issues`, `.summary`, `.scores`, `.plan`. Low effort, high value — prevents the next silent hang.

**AUDIT: find any other mutating route with no ownership check** — Gotcha #11's `DELETE` routes are fixed, but they were only found because this session happened to build a delete feature and looked closely. `PATCH /api/players/[playerId]` and `PATCH /api/sessions/[sessionId]` (at minimum) still take no `coachId` and do no ownership verification — a bug class, not two isolated bugs. Worth a deliberate audit of every mutating route (`POST`/`PATCH`/`DELETE`) in `app/api/` rather than waiting to find the next one by accident.

**Live end-to-end verification of auto-generated feedback** — see Next Session Priority 1. Implemented and logic-verified; not yet proven against a real upload through the deployed app.

**Why is `position` NULL on some tested sessions** — see Next Session Priority 2. Now safe-to-serve regardless (hedging fix), but the root cause is still unknown.

**`/feedback` output shape divergence from original plan** — see Next Session Priority 3.

**Fault taxonomy — now understood to be two axes, not one** — see Next Session Priority 4. Positions beyond OL, *and* technique beyond stance, both need calibration rules from scratch.

**`ADMIN_SECRET` should be rotated** — exposed in a debugging screenshot this session (see "What Was Fixed" above). Not done yet.

**Resend custom domain** — unchanged, still outstanding. All transactional emails send from `onboarding@resend.dev`.

**Front-view biomechanical analysis** — unchanged, still skipped entirely by the Python service.

**`supabase/migration-v3-drills-feedback.sql` unapplied, safe to delete** — unchanged from prior session. Unrelated to the new `migration-v10-feedback-column.sql`, which *has* been applied.

**`getOrCreateCoach()` can create coach with no consent trail** — unchanged, still open.

**Session list ordering on player detail page lacks clear timestamp indication** — unchanged, low priority.

---

## Key File Reference

| File | Purpose |
|---|---|
| `service/main.py` | Python analysis service: FastAPI endpoints, MediaPipe processing, Supabase writes, sb_secret_ fix, `/feedback` route + `require_admin` dependency, and (as of 2026-07-17) auto-generates feedback inline inside `/analyse` — best-effort, try/except-wrapped, skipped on zero-detection |
| `service/feedback.py` | Builds the GPT-4o-mini prompt from raw measurements + fault_type/line_side/position, calls OpenAI, returns structured feedback. Zero-detection fallback guard. All three of fault_type/line_side/position are Optional — `None` gets an explicit "UNKNOWN, do not guess" cue rather than a silently-substituted default (the 2026-07-17 hedging fix). No `overall_grade` as of 2026-07-17 (owner decision — removed, not hidden). |
| `service/pose_utils.py` | MediaPipe pose landmark extraction, side-view slope calculation |
| `service/measurements.py` | `aggregate_side_measurements()` — filters frames, computes slope stats |
| `supabase/migration-v10-feedback-column.sql` | **New, applied.** Adds `feedback` JSONB column to `session_videos`. |
| `supabase/migration-v11-consent-retain-on-player-delete.sql` | **New, applied.** Changes `consent_records_player_id_fkey` to `ON DELETE SET NULL` and patches the `prevent_consent_update()` trigger to allow that one specific cascade update — see Gotcha #12. |
| `app/api/players/[playerId]/route.ts` | GET/PATCH/**DELETE**. `DELETE` rewritten 2026-07-17 — see Gotcha #11: ownership check, storage-first hard-delete cascading through sessions/session_videos, consent_records retained (not touched). `PATCH` still has no ownership check — see outstanding audit item. |
| `app/api/sessions/[sessionId]/route.ts` | GET/PATCH/**DELETE**. `DELETE` rewritten 2026-07-17 — same treatment as the player route, scoped to one session. `PATCH` still has no ownership check. |
| `components/DeletePlayerButton.tsx` | **New.** `window.confirm()` naming the player + session count, calls `DELETE /api/players/[playerId]`. Wired into the player detail page header. |
| `components/DeleteSessionButton.tsx` | **New.** `window.confirm()` naming the session date, calls `DELETE /api/sessions/[sessionId]`. Wired into the session detail page header. |
| `app/api/videos/presign/route.ts` | Step 1 of upload: consent gate + signed URL issuance |
| `app/api/videos/confirm/route.ts` | Step 2 of upload: DB row insert + paired-clip check + Inngest fire |
| `app/api/videos/upload/route.ts` | **Deprecated** — no longer called, kept for reference |
| `app/api/videos/analyze/route.ts` | **Deprecated 2026-07-14** — single-clip GPT-4o vision; kept for reference |
| `lib/openai.ts` | OpenAI client (Next.js side); `generateTrainingPlanAI()` (active); `analyzeVideoFrames()` (deprecated) |
| `lib/inngest.ts` | Inngest client, app ID `practice-field` |
| `lib/jobs/ol-stance-analysis.ts` | Inngest function: validates session, marks processing, calls Python /analyse — **check here first for Priority 2 (position NULL investigation)** |
| `lib/server-frames.ts` | **Deprecated 2026-07-14** — FFmpeg frame extraction for single-clip path; kept for reference |
| `components/VideoAnalysisCard.tsx` | Renders structured VideoAnalysis; raw Python measurements now show a "feedback pending" placeholder instead of a raw dump (2026-07-17). Exports `isStructuredAnalysis()` — reused by the plan page. |
| `components/FeedbackCard.tsx` | Renders the `feedback` column (GPT-4o output) on the session results page. Returns `null` if `feedback` is null. No grade badge as of 2026-07-17. |
| `components/SessionAutoRefresh.tsx` | **New.** Client island, polls via `router.refresh()` while a side video's `analysis_status` isn't yet terminal; stops on `complete`/`failed` with one grace poll to catch fast-follow feedback. Renders nothing. |
| `components/VideoUpload.tsx` | **Deprecated 2026-07-14** — single-clip upload UI; no longer rendered |
| `components/TwoClipUpload.tsx` | Two-clip OL stance upload UI: presign → Storage PUT → confirm (×2) |
| `app/[coachId]/players/[playerId]/sessions/[sessionId]/page.tsx` | Session results page — `force-dynamic`, fetches videos, renders `VideoAnalysisCard` + `FeedbackCard` per drill, plus `SessionAutoRefresh` for live updates |
| `app/[coachId]/players/[playerId]/plan/page.tsx` | Virtual Training Coach plan builder. **Fixed 2026-07-17** — crashed for essentially every player reading `analysis.issues` without `isStructuredAnalysis()`; see Gotcha #8. |
| `app/[coachId]/players/[playerId]/videos/page.tsx` | Coach video library + upload tab (two-clip only as of 2026-07-14) |
| `app/api/inngest/route.ts` | Inngest serve endpoint — must be synced manually in Inngest dashboard after deploy |
| `types/index.ts` | `VideoAnalysis`, `SessionVideo` (includes `view_angle`, `feedback: StanceFeedback \| null`), `AnalysisStatus`, `StanceFeedback`/`StanceFeedbackIssue` (matches `service/feedback.py`'s actual output shape — no `overall_grade` as of 2026-07-17; `OverallGrade` type still exists, used by `VideoAnalysis` only) |
| `service/Dockerfile` | Railway container — includes libgles2/libegl1, wget for model, ENV MODEL_PATH |
| `service/requirements.txt` | Pinned exact versions (mediapipe==0.10.35, supabase==2.31.0, openai==1.59.6, etc.) |
| `.claude/launch.json` | **New.** Dev server launch config (`npm run dev`, port 3000) for browser preview tooling. |

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

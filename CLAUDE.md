# Practice Field — Claude Code Context

> Last updated: 2026-07-14 (session that fixed upload architecture, Inngest sync, session page caching, disabled single-clip vision pipeline)

## Architecture Overview

**Stack:** Next.js 14 App Router (Vercel) · Supabase (Postgres + Auth + Storage, project ID `kzyxheyobuoqtwmdjwau`) · Python FastAPI service (Railway) · Inngest v4 (job orchestration) · Resend (transactional email) · OpenAI GPT-4o (text feedback — planned; vision pipeline disabled)

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
  → writes RAW measurements to session_videos.analysis (side-view row only)
  → front-view row: analysis_status set to 'complete', analysis stays null
```

Produces: `slope_deg_mean`, `lean_from_vertical_mean`, `detection_rate`, `reliable`, etc.  
Missing: GPT-4o feedback pass — raw numbers are NOT the structured VideoAnalysis shape  
Status: end-to-end working; GPT-4o text feedback step is a known planned addition

### Single-clip GPT-4o Vision pipeline (DISABLED 2026-07-14)

`/api/videos/analyze` and `analyzeVideoFrames()` in `lib/openai.ts` are kept for reference but no longer called. The single-clip UI option was removed from `app/[coachId]/players/[playerId]/videos/page.tsx`. Disabled because cost was ~$0.018/call (2.5× the $0.007 target). The prompt structure, position cues, and VideoAnalysis JSON schema in `lib/openai.ts` are directly reusable for the planned GPT-4o text feedback writer.

### VideoAnalysisCard handles both analysis shapes

`components/VideoAnalysisCard.tsx` uses `isStructuredAnalysis()` type guard (checks for presence of the `summary` string field) to discriminate between the two payloads:
- Structured `VideoAnalysis` → full card UI (grade badge, tabs, issues, scores, plan)
- Raw Python measurements → simple key/value table of pose numbers
- `analysis` field null or missing → status-message UI (awaiting/processing/failed)

### Upload architecture (signed URL — critical)

All uploads go through:
1. `POST /api/videos/presign` — runs consent gate, issues Supabase signed URL
2. Browser `PUT` directly to Supabase Storage (bypasses Vercel entirely for file bytes)
3. `POST /api/videos/confirm` — inserts DB row, runs paired-clip check, fires Inngest

`/api/videos/upload` still exists as deprecated reference — nothing calls it.

### Ownership model

Two mutually exclusive ownership paths enforced by DB constraint `chk_sv_has_owner`:
- Coach-managed player: `player_id + coach_id` (no `player_account_id`)
- Self-signup player: `player_account_id` (no `player_id` or `coach_id`)

### analysis_status lifecycle (two-clip path)

```
awaiting_both  → (side uploaded, no session_id)
awaiting_front → (side uploaded, session_id set, waiting for front)
awaiting_side  → (front uploaded, session_id set, waiting for side)
ready          → (both clips present, Inngest not yet started)
processing     → (Inngest mark-processing step ran, Python service running)
complete       → (Python service wrote results; side row has analysis, front row has null analysis)
failed         → (error path)
```

---

## Critical Gotchas — Do Not Re-Debug

### 1. Vercel 4.5 MB request body limit
Vercel serverless functions have a hard 4.5 MB request body limit that **cannot be raised via config** (`vercel.json`, route segment config, or any other setting). The platform returns a plain-text `413 Request Entity Too Large` response.

**Fix applied:** All video uploads use the presign + direct-to-Storage pattern. The Next.js API routes never receive file bytes. Do not revert to multipart POST through an API route for any file upload.

### 2. Inngest apps do NOT auto-register
After setting `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in Vercel and deploying, you **must manually sync** via:  
Inngest dashboard → Apps → Sync New App → enter `https://<your-domain>.vercel.app/api/inngest`

This is a one-time step per environment. If skipped, `inngest.send()` throws with no useful error. Required env vars (both server-only, no `NEXT_PUBLIC_` prefix):
- `INNGEST_EVENT_KEY` — from Inngest dashboard → Settings → Event Keys
- `INNGEST_SIGNING_KEY` — from Inngest dashboard → Settings → Signing Keys

### 3. Env var changes require a fresh deploy
Environment variable changes in Vercel and Railway do not apply to already-running deployments. Always trigger a fresh deploy after saving env vars and confirm the deployment timestamp is newer than the save time before testing.

### 4. Next.js App Router static caching with direct Supabase client
Pages that use `getAdminClient()` are still subject to Next.js full-route static caching and will serve stale rendered HTML.

**Fix:** Add `export const dynamic = 'force-dynamic'` as the first line of any page that reads live data (analysis results, session status, etc.).

Already applied to: `app/[coachId]/players/[playerId]/sessions/[sessionId]/page.tsx`

### 5. supabase-py 2.31.0 + sb_secret_ key format
`supabase-py` 2.31.0 sends the service key on both `apikey` (correct) and `Authorization: Bearer` (rejected for non-JWT keys). Supabase's new `sb_secret_...` key format is not a JWT.

**Fix applied in `service/main.py` `get_supabase()`:**
```python
client = create_client(
    SUPABASE_URL, SUPABASE_KEY,
    options=ClientOptions(headers={"Authorization": ""}),
)
client.options.headers.pop("Authorization", None)
```
The JS Supabase client does **not** have this problem.

### 6. Resend sandbox domain restricts delivery
`onboarding@resend.dev` (current FROM address) cannot deliver to arbitrary real email addresses — only to addresses verified in your Resend account. Consent emails are broken for real users until a custom verified domain is configured. FROM address must be updated in:
- `app/api/players/route.ts`
- `app/api/players/[playerId]/resend-consent/route.ts`
- `app/api/player-accounts/route.ts`

### 7. Python service: analysis written to side-view row only
The Python service writes `analysis_status: 'complete'` and the analysis payload **only to the side-view row**. The front-view row is marked `complete` with `analysis: null`. This is intentional — front-view biomechanical processing is not yet implemented.

### 8. session_videos.analysis column holds two incompatible shapes
The `analysis` JSONB column is written by two pipelines producing different JSON shapes. Always use `isStructuredAnalysis()` from `VideoAnalysisCard.tsx` before treating the `analysis` field as a `VideoAnalysis`. Calling `.length` or `.sort()` on `analysis.issues` without the guard will crash.

---

## What Was Fixed This Session

- **Signed-URL upload architecture** — replaced multipart POST through Vercel with presign + direct-to-Storage + confirm pattern. Files: `app/api/videos/presign/route.ts` (new), `app/api/videos/confirm/route.ts` (new), `components/VideoUpload.tsx`, `components/TwoClipUpload.tsx`
- **Front-view row stuck at 'processing'** — `service/main.py` now marks the front-view row `complete` after the side-view write
- **Inngest sync** — `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` added to Vercel; app manually synced at `/api/inngest`
- **Session results page** — built `app/[coachId]/players/[playerId]/sessions/[sessionId]/page.tsx` with signed URLs, side/front grouping, VideoAnalysisCard per drill, `force-dynamic`
- **VideoAnalysisCard raw measurements crash** — added `isStructuredAnalysis()` type guard; card renders pose-measurement key/value table instead of crashing
- **`view_angle` field missing from TypeScript type** — added `view_angle: 'side' | 'front' | null` to `SessionVideo` interface in `types/index.ts`
- **VideoAnalysisCard awaiting statuses** — added render cases for `awaiting_both`, `awaiting_front`, `awaiting_side`, `ready`
- **Single-clip vision pipeline disabled** — removed "Single clip" mode selector from videos page; `/api/videos/analyze` and `analyzeVideoFrames()` marked deprecated, kept for reference. Decision: cost was ~$0.018/call (2.5× $0.007 target); superseded by two-clip MediaPipe path + planned GPT-4o text feedback writer. Existing analyzed videos retain their `session_videos.analysis` data intact.
- **Supabase key migration complete** — both keys rotated to new format and legacy JWT keys fully disabled in Supabase (Settings → API Keys → Legacy → "Disable JWT-based API keys"). `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `sb_publishable_...` format (no code change needed); `SUPABASE_SERVICE_ROLE_KEY` → `sb_secret_...` format (requires Authorization-header fix in `service/main.py`, already applied — see Gotcha #5). Verified live: coach dashboard and player signup both confirmed working after legacy key disable.

---

## What's Still Outstanding

**GPT-4o text feedback pass for two-clip OL sessions**  
The Python service writes raw MediaPipe measurements; no GPT-4o call converts them to structured coaching feedback. Planned: admin-only route, text-only prompt with measurements, `gpt-4o-mini`, `json_object` response. Gate: dev/admin-only until output quality is reviewed.

**Resend custom domain**  
All transactional emails send from `onboarding@resend.dev`. Real delivery requires a verified custom domain in Resend. FROM address must be updated in three files (see Gotcha #6).

**Front-view biomechanical analysis**  
Python service skips front-view clip entirely (log: "front-view processing not yet implemented"). Front-view row gets `analysis_status: complete` with `analysis: null`.

**fault_type / line_side / position fields never persisted or displayed**  
These columns exist in `session_videos` and the Inngest event passes them to Python, but Python never writes them back. No UI reads them.

**`supabase/migration-v3-drills-feedback.sql` unapplied, safe to delete**  
Creates `drills`, `videos`, `feedback_notes` tables + drill-library bucket. Never applied; no code references it. Decision to delete pending.

---

## Key File Reference

| File | Purpose |
|---|---|
| `service/main.py` | Python analysis service: FastAPI endpoints, MediaPipe processing, Supabase writes, sb_secret_ fix |
| `service/pose_utils.py` | MediaPipe pose landmark extraction, side-view slope calculation |
| `service/measurements.py` | `aggregate_side_measurements()` — filters frames, computes slope stats |
| `app/api/videos/presign/route.ts` | Step 1 of upload: consent gate + signed URL issuance |
| `app/api/videos/confirm/route.ts` | Step 2 of upload: DB row insert + paired-clip check + Inngest fire |
| `app/api/videos/upload/route.ts` | **Deprecated** — no longer called, kept for reference |
| `app/api/videos/analyze/route.ts` | **Deprecated 2026-07-14** — single-clip GPT-4o vision; kept for reference |
| `lib/openai.ts` | OpenAI client; `generateTrainingPlanAI()` (active); `analyzeVideoFrames()` (deprecated, reuse for text writer) |
| `lib/inngest.ts` | Inngest client, app ID `practice-field` |
| `lib/jobs/ol-stance-analysis.ts` | Inngest function: validates session, marks processing, calls Python /analyse |
| `lib/server-frames.ts` | **Deprecated 2026-07-14** — FFmpeg frame extraction for single-clip path; kept for reference |
| `components/VideoAnalysisCard.tsx` | Renders both structured VideoAnalysis and raw Python measurements via `isStructuredAnalysis()` |
| `components/VideoUpload.tsx` | **Deprecated 2026-07-14** — single-clip upload UI; no longer rendered |
| `components/TwoClipUpload.tsx` | Two-clip OL stance upload UI: presign → Storage PUT → confirm (×2) |
| `app/[coachId]/players/[playerId]/sessions/[sessionId]/page.tsx` | Session results page — `force-dynamic`, fetches videos, renders VideoAnalysisCard per drill |
| `app/[coachId]/players/[playerId]/videos/page.tsx` | Coach video library + upload tab (two-clip only as of 2026-07-14) |
| `app/api/inngest/route.ts` | Inngest serve endpoint — must be synced manually in Inngest dashboard after deploy |
| `types/index.ts` | `VideoAnalysis`, `SessionVideo` (includes `view_angle`), `AnalysisStatus` |
| `service/Dockerfile` | Railway container — includes libgles2/libegl1, wget for model, ENV MODEL_PATH |
| `service/requirements.txt` | Pinned exact versions (mediapipe==0.10.35, supabase==2.31.0, etc.) |

## Environment Variables (complete list)

**Vercel (Next.js app):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `sb_publishable_...` format (migration complete; legacy JWT keys disabled)
- `SUPABASE_SERVICE_ROLE_KEY` — `sb_secret_...` format; JS client handles it without code changes (legacy JWT keys disabled)
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL` — bare origin, no trailing slash
- `INNGEST_EVENT_KEY` — required for `inngest.send()` to work; get from Inngest dashboard
- `INNGEST_SIGNING_KEY` — required for Inngest → your serve route; get from Inngest dashboard
- `ANALYSIS_SERVICE_URL` — Railway service URL (e.g. `https://your-service.railway.app`)
- `ANALYSIS_SERVICE_SECRET` — shared secret matching `SERVICE_SECRET` on Railway

**Railway (Python service):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — `sb_secret_...` format; requires the Authorization-header fix in `get_supabase()` (see Gotcha #5)
- `SUPABASE_STORAGE_BUCKET` — value: `session-videos`
- `SERVICE_SECRET` — shared secret matching `ANALYSIS_SERVICE_SECRET` on Vercel
- `MEDIAPIPE_MODEL_PATH` — set by Dockerfile to `/app/pose_landmarker_heavy.task`; leave blank in Railway dashboard

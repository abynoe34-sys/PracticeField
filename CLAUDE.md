# Practice Field — Claude Code Context

> Last updated: 2026-07-19 (session building photo upload support per BUILD_SPEC_photo_upload.md — Feature A and Feature B both shipped — then an exhaustive route-ownership security audit closing every remaining client-trusted-coachId gap across the whole API surface)

## Next Session Priorities

1. **No coach "forgot password" flow exists yet.** Coaches have real passwords (as of 2026-07-18) but there's no reset-password page — `getSupabaseClient().auth.resetPasswordForEmail()` needs a page to land on. Players have the same gap (pre-existing, not new). Low effort, real user-facing risk.

2. **Legacy `coaches` rows (~30) are permanently inert under the new auth model** — by explicit owner decision (2026-07-18), not migrated, not backfilled. Most are bot-crawler noise (`favicon.ico`, `contact-us`, etc. — see Gotcha #13). Not a bug — a decision.

3. **`/feedback` output shape — still partially undecided.** Unchanged from before — see "What's Still Outstanding" below.

4. **Fault taxonomy expansion** — unchanged, still deferred pending calibration data. See "What's Still Outstanding" below.

5. **`POST /api/sessions`, `/api/training-plans`, `/api/progress` return 404 (not 403) for a cross-owner `player_id`.** Minor consistency gap left by the 2026-07-19 audit — these three use a single combined `.eq('id', playerId).eq('coach_id', coachId)` query rather than the fetch-then-compare 404-vs-403 split used everywhere else (delete routes, `/presign`, `/confirm`, the other GET-by-id routes). Not a security hole — cross-owner writes are still fully blocked, confirmed live — just an inconsistent error code. Low priority polish.

---

## Architecture Overview

**Stack:** Next.js 14 App Router (Vercel) · Supabase (Postgres + Auth + Storage, project ID `kzyxheyobuoqtwmdjwau`) · Python FastAPI service (Railway) · Inngest v4 (job orchestration) · Resend (transactional email) · OpenAI GPT-4o-mini (text feedback — **live as of 2026-07-17**, admin-gated)

### Unified accounts — coaches and players, real auth (2026-07-18)

Before this session, coaches had **zero authentication** — a coach was just a `coach_id` string in the URL (`/[coachId]/...`), auto-created on first visit by `getOrCreateCoach()` with no password, no email requirement, no ownership check anywhere. Anyone who knew or guessed a `coachId` could view or act as that coach. Players already had real auth (Supabase Auth + `player_accounts`); coaches did not.

**Role model — derived, not stored.** No `role` column anywhere. A user is a coach if a `coaches` row has their `auth_user_id`; a player if a `player_accounts` row does. Mutually exclusive by construction (separate tables, separate id spaces), matching how ownership is modeled everywhere else in this schema (`chk_sv_has_owner`'s mutually-exclusive-FK pattern). See `lib/auth-role.ts`'s `resolveRole()`.

**Session storage moved from localStorage to cookies.** `lib/supabase.ts`'s browser client is now `createBrowserClient` (`@supabase/ssr`), not plain `createClient`. This is required so server-side code (Server Components, layouts, route handlers) can read "who is this" — a plain `@supabase/supabase-js` client's session lives only in the browser, invisible server-side. `lib/supabase-server.ts` (`getServerSupabase()`/`getServerUser()`) is the server-side counterpart, reading the same cookies via `next/headers`. `middleware.ts` does the standard Supabase session-refresh dance (required so cookies don't go stale) — it does NOT do any redirect/gating logic itself, that lives in the layout below.

**The actual security boundary: `app/[coachId]/layout.tsx`.** Every page under `/[coachId]/...` is wrapped by this layout, which runs server-side before any child page's own data fetch. Three outcomes: no session → `/login`; session belongs to a player → `/player/dashboard`; session belongs to a *different* coach than the URL → redirect to their own `coachId`. Only an exact match renders. This is real protection (runs before the admin-client data fetch), not a cosmetic client-side check.

**Entry points:** `/signup` (role picker — coach or player, then the role-specific form) and `/login` (single form for both; after `signInWithPassword`, calls `GET /api/whoami` to resolve role and redirect). `app/player/signup` and `app/player/login` are now thin redirects to the unified pages (kept so old bookmarks still work). `components/PlayerSignupForm.tsx` and `components/CoachSignupForm.tsx` hold the actual form logic; `POST /api/player-accounts` (unchanged) and `POST /api/coaches/signup` (new) do the account creation, both following the same pattern (admin-API-created auth user, `email_confirm: false`, verification link sent via Resend, not Supabase's default email).

**API ownership strengthened, not just pages.** `lib/require-coach.ts`'s `requireCoachSession()` derives `coachId` from the verified session cookie — same-origin `fetch()` sends cookies automatically, so calling code needed no changes. Applied to `POST`/`GET /api/players`, `PATCH`/`DELETE /api/players/[playerId]`, `PATCH`/`DELETE /api/sessions/[sessionId]`, and `PATCH /api/coach`. Previously several of these trusted a client-supplied `coachId` (query param or request body) with zero verification — see Gotcha #11's original finding on the DELETE routes; this session found the exact same gap on `POST /api/players` (`body.coach_id` trusted directly) and closed the still-open `PATCH` gap CLAUDE.md had already flagged as outstanding.

**Coach sign-out** (`components/Navigation.tsx`) — didn't exist before this session; coaches had no session to sign out of. Now `getSupabaseClient().auth.signOut()` + redirect to `/login`.

**Verified live**, not just typechecked: real coach signup → login → own dashboard → added a real player (confirmed correct `coach_id` in DB, not spoofable). Real player signup → login → fully functional solo dashboard, no coach. Cross-coach access blocked at both the page level (redirected to own dashboard, confirmed by direct URL navigation) and the API level (`DELETE /api/players/[id]` as the wrong coach → 403, confirmed nothing touched via a fresh DB read). Role-gating confirmed both directions with real tokens: a player's token against a coach-only route → 403; a coach's token against `/api/player-accounts/me` → 404 (no matching player account, correctly denied). Logout confirmed to actually clear the server-readable session (immediate re-navigation to the dashboard redirects to `/login`). All disposable test accounts, their `auth.users` rows, and their consent records cleaned up afterward.

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

### Analyzed stance photos — Feature A (2026-07-19)

`BUILD_SPEC_photo_upload.md` (owner-provided handoff doc, not committed — kept in Downloads) covers two features; this is the first, larger one. A side+front **photo** pair is now an alternative to a side+front **video** pair, flowing through the identical pipeline: same `TwoClipUpload.tsx` component, same `session_videos` row shape, same `analysis_status` lifecycle, same `/feedback` step. Distinguished by a new `media_type` column (`'video'` default, `'photo'` for this path).

**No mixing within a pair.** Side and front must be the same `media_type` — a mixed pair has no well-defined analysis path (which MediaPipe running mode would `/analyse` even use?). Enforced in two places independently: `TwoClipUpload.tsx` rejects picking a file whose type doesn't match the other slot's already-established type, and `lib/jobs/ol-stance-analysis.ts`'s `validate-session` step re-checks the pairing against a fresh DB read before calling `/analyse` (the same "never trust the event payload alone" discipline that step already applies to readiness/pairing).

**`media_type` is derived server-side, never client-supplied.** `app/api/videos/confirm/route.ts`'s `deriveMediaType()` reads it off the actual `storage_path` extension — the signed URL from `/presign` only accepts an upload landing at that exact path, so the extension reflects what was truly validated and stored, not a client claim.

**MediaPipe IMAGE-mode branch.** `service/pose_utils.py` gained `load_model_image()`/`process_image_side()` — a *second* `PoseLandmarker` instance loaded in `RunningMode.IMAGE` at service startup, alongside the existing `VIDEO`-mode one. MediaPipe's running mode is fixed at creation (a `VIDEO`-mode landmarker only exposes `detect_for_video()`, an `IMAGE`-mode one only `detect()`) — they are not interchangeable, hence two separate instances (`_landmarker` / `_landmarker_image` in `service/main.py`), both loaded in `lifespan()`, both closed on shutdown. `/health` now reports both.

**Single-frame reliability is conservative by design — this is the load-bearing decision in this feature.** `service/measurements.py`'s new `aggregate_single_frame_measurement()` does **not** reuse `aggregate_side_measurements()`'s `detection_rate >= 0.5` formula for `reliable`. A single photo always gets `reliable: False`, *regardless of whether that one frame detected cleanly* — verified live: a real test photo produced `detection_rate: 1.0` (clean detection) but `reliable: false`. A single sample can never earn the confidence a multi-frame video's majority vote can, and the spec is explicit that a photo must not silently present as fully reliable. This reuses (does not duplicate) the hedge `service/feedback.py`'s prompt already had from the position-NULL fix ("if reliable is false, keep the summary and issues conservative") — the only change needed there was fixing `_measurements_summary()`'s parenthetical explanation of `reliable`, which used to say "False means detection_rate was below 50%" — no longer universally true once a photo can be `reliable: false` at `detection_rate: 1.0`, so the wording was generalized to cover both cases without being factually wrong for either.

**Auth (this spec predates the accounts work — explicit note in the spec itself).** Building this surfaced that `/api/videos/presign` and `/api/videos/confirm` still trusted `coach_id` from the request body outright — the exact gap already closed on `/api/players` and the delete routes (Gotcha #11's lineage), just never retrofitted on the upload path. Both routes now derive `coachId` from `requireCoachSession()` and verify `playerId` ownership via a fresh DB read, with the same 404-vs-403 split as the delete routes (a nonexistent `playerId` → 404, an existing `playerId` owned by a *different* coach → 403 — the original code conflated these into a blanket 404). See Gotcha #16.

**Verified live end-to-end**, not just typechecked: uploaded a real side+front photo pair through the actual authenticated path (extracted real stance-photo stills from an existing legacy video pair already in this project's own storage, rather than sourcing new external images). `media_type: 'photo'` landed on both rows, pairing/Inngest fired identically to video, the Python service took the IMAGE branch, `/feedback` auto-generated and was correctly, visibly hedged ("data comes from a single frame... unreliable stance evaluation"), `FeedbackCard` rendered it with no console errors, a cross-owner presign attempt was refused with 403, and a player hard-delete removed both `.jpg` storage files with zero orphans left in `storage.objects`. Disposable fixtures cleaned up afterward.

### Reference photos — Feature B (2026-07-19)

The second, smaller half of `BUILD_SPEC_photo_upload.md`. Plain images attached to a player and/or a specific session, for documentation/form-check — deliberately **no** analysis: no MediaPipe, no measurements, no `/feedback`, no `analysis_status`. Lives in a new `reference_photos` table (migration-v14), **not** in `session_videos` — that table carries analysis semantics a reference photo doesn't have, and reusing it would be the exact shape-confusion class of bug documented in Gotcha #8 (which has already caused a real production hang twice).

**Owner model mirrors `session_videos`/`sessions` exactly** — the same mutually-exclusive-FK pattern (`chk_rp_has_owner`: either `player_id`+`coach_id`, or `player_account_id` alone), plus an optional `session_id` on top so a photo can be attached at the player level (general) or scoped to one session. No separate `uploaded_by` column — like `resolveRole()`, it's derived from which owner shape the row has, not stored redundantly.

**New API surface**, all session-derived ownership (never client-supplied, from day one — no retrofit needed since this is new code): `POST /api/reference-photos/presign` and `/confirm` (same direct-to-storage pattern as video/photo, `session-videos` bucket under a `reference-photos/` prefix, same consent gate coach-managed uploads already require — a reference image is still a photo of a possibly-minor player), `GET /api/reference-photos` (list, coach query-param or player-account JWT), `DELETE /api/reference-photos/[photoId]` (storage-first, ownership-checked).

**UI deliberately separate from `TwoClipUpload.tsx`** so "photo I want analyzed" and "photo for reference" can't be confused: `ReferencePhotoUpload.tsx` is a single always-visible control labeled "not analyzed" (no drag-drop, no side/front slots, no pairing language), `ReferencePhotoGallery.tsx` is a labeled thumbnail grid with a click-to-enlarge lightbox, and `ReferencePhotosSection.tsx` is the client-island wrapper combining both with local state — wired into the player detail page (player-level), the session detail page (session-level), and the player's own self-signup dashboard (both coaches and players can upload, per the spec).

**Delete cascades extended, not just added.** `DELETE /api/players/[playerId]` and `DELETE /api/sessions/[sessionId]` now also gather and storage-remove reference photo files before any DB row is touched. `reference_photos`' FKs are `ON DELETE CASCADE`, which cleans up the DB rows automatically — but Postgres FK cascade only ever touches rows, never Storage objects, so the explicit storage-first step is still required (same reasoning that already applies to `session_videos`). Both routes' response field was renamed `deletedVideoFiles` → `deletedFiles` since it now counts both kinds.

**Verified live end-to-end**: coach upload at both player- and session-level (gallery correctly scoped by `session_id` — a session-level photo doesn't leak into the player-level gallery), a cross-owner presign attempt refused with 403, standalone delete confirmed to remove the Storage object (checked `storage.objects`, not just the DB row), and a player hard-delete with two attached reference photos cascaded both files with zero orphans (`deletedFiles: 2`, storage swept clean). Self-signup player path verified separately: upload and view via JWT bearer token, a cross-account `GET` attempt refused with 404 (matching the existing `/api/player-accounts/me` convention for "not yours"). Confirmed a reference photo never creates a `session_videos` row — structurally guaranteed by having its own table with no analysis columns to populate, not just a convention.

---

## Brand & Design System (2026-07-18)

Applied from `BRAND_SPEC_practice_field.md` (owner-provided handoff doc, not committed to the repo — kept in Downloads). The spec's authoritative colors were sampled directly from the official logo (`practice_field_logo_960.png`).

**Tokens live in `tailwind.config.ts`**, reconciled into the existing `brand-*`/`field-*` scales rather than adding a parallel system — the entire app already used these two token families in ~30 files, so retuning them re-skins the whole app coherently:

- `brand-600` = `#EC3D50` — THE brand red, single accent for buttons/links/active states/focus rings (this is what "primary action" resolves to everywhere: `bg-brand-600 hover:bg-brand-500`).
- `brand-700` = `brand.red-deep` = `#C9384D` — a deliberately distinct deeper red. See "Red collision" below.
- `brand.navy` / `brand.plum` / `brand.maroon` = `#072743` / `#33253F` / `#652945` — the three gradient stops, also usable directly (`bg-brand-navy`, etc.).
- Full `brand` 50–950 numeric scale interpolated around `#EC3D50` so every existing `brand-400`/`brand-300`/`brand-900` usage (links, badges, hover states) stays in the red family instead of the old indigo.
- `field.dark` = `#0B0E1A`, `field.card` = `#1C1830`, `field.border` = `#3A3050` — nudged from the old navy-only values toward the spec's plum-navy family (previously more indigo-navy, now visibly related to the gradient).
- `field.muted` = `#A99FB5` — new; used for secondary/muted text on the surfaces touched this rollout (login/signup/landing/dashboards). Older pages still mostly use stock Tailwind `gray-*` for muted text — harmless, just not yet migrated (low priority, cosmetic).
- `backgroundImage['brand-gradient']` = `linear-gradient(135deg, #072743 0%, #33253F 55%, #652945 100%)` — the signature gradient, applied via `bg-brand-gradient`.

**Where the gradient vs. flat surfaces are used**, per spec §4: `bg-brand-gradient` on `/`, `/login`, `/signup` only (hero/auth surfaces). Everywhere else (coach dashboard, player dashboard, session/player detail pages, FeedbackCard, etc.) uses the flat `field-dark`/`field-card` surfaces so dense content stays readable — the gradient is an accent, not every background.

**Shape language**: buttons/inputs/cards on the touched surfaces (login, signup, landing, dashboards, Navigation, FeedbackCard, VideoAnalysisCard) use `rounded-md` (6px) instead of the old `rounded-xl`/`rounded-2xl` (12–16px), per the spec's "small border radii (2–6px), not pill-round everything." Pages not explicitly in this rollout (videos, sessions, plan, settings, consent, terms, training-plans, etc.) still use the old larger radii — cosmetic, not urgent, pick up naturally if/when those pages get touched.

**Logo**: `public/practice-field-mark.png` — copied from the spec's frameless `practice_field_logo_960.png` deliverable. **Do not use `public/logo.png`** for any new UI — it's the old version with a white rounded card baked into the asset, which the spec explicitly says should not bleed into the dark UI. `public/logo.png` is only still referenced by `PROJECT_HANDOVER_2026-06-30.md` (a doc, not code) — left alone. Note the new asset is a raster PNG with the dark gradient background baked into the square image (not transparent) — at nav size (32px) this reads fine against the dark nav bar; a transparent SVG mark is explicitly out-of-scope/later in the spec itself, not a regression introduced here.

**Two judgment calls the spec flagged explicitly** — both resolved and documented here so they aren't re-litigated:

1. **Red collision (severity-critical vs. brand accent).** Once `brand-600` became the actual brand red, `FeedbackCard.tsx`'s and `VideoAnalysisCard.tsx`'s `SEVERITY_STYLES.critical` (previously stock Tailwind `red-950/red-400/red-800`, coincidentally similar hue) would have sat right next to CTA buttons using the exact same red-family accent on the same page — "this is broken" and "click here" wearing the same color. **Resolved by splitting them**: `brand-600` (`#EC3D50`) stays reserved for brand/action only; `SEVERITY_STYLES.critical` in both components (they're documented as required to stay in sync, see Gotcha #8) now uses `bg-brand-950 text-brand-300 border-brand-700` — `brand-700`/`brand-red-deep` is `#C9384D`, the spec's own suggested deep-red value. Also applied to the one other literal duplicate of that old class string: the `mod.priority === 'urgent'` badge in `VideoAnalysisCard`'s plan tab. Severity is still always paired with an uppercase text label (never color alone), per the spec's accessibility guardrail.
2. **Logo asset — frameless, not the white-card version.** Confirmed the provided `practice_field_logo_960.png` has no white rounded card (visually inspected before use) and used it everywhere a mark appears in-app (Navigation, login, signup, landing hero, player dashboard header). The old `public/logo.png` (white-card version) was left in place but is no longer referenced by any component.

**Verified live**, not just typechecked: real disposable coach + player accounts signed up and logged in through `/signup`/`/login`/dashboards; computed styles read back via `getComputedStyle()` confirmed every touched surface resolves to the exact configured hex values (gradient stops, `#EC3D50` buttons, `#1C1830` cards, `#3A3050` borders, `6px` radii, the `#C9384D` severity-critical split, the skewed red active-nav underline). All disposable test fixtures cleaned up afterward via the established append-only-trigger-safe pattern (Gotcha #15), confirmed gone via zero-count sweeps.

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

**This gotcha has now bitten four times.** Originally the guard was applied only in `VideoAnalysisCard.tsx`. On 2026-07-17 it was found that `app/[coachId]/players/[playerId]/plan/page.tsx` read `analysis.issues.sort(...)` with no guard, throwing a `TypeError` on the raw-measurement shape (which has no `issues` key). Because `load()` had no try/catch, `setLoading(false)` never ran and the page hung silently on "Loading…" forever — in production, for essentially every player, since every two-clip session produces the raw shape. Fixed by exporting `isStructuredAnalysis()` from `VideoAnalysisCard.tsx` and applying it in the plan page, plus wrapping `load()` in try/catch/finally so any future error surfaces instead of hanging silently. Verified against two players locally (session `2a740dec-572e-4d42-ad52-4713a2a793f3`'s player, and the "john" / `FG8Q7KLS2` player who originally reproduced the production hang) — both load correctly now.

**The repo-wide sweep on 2026-07-19 found two more.** `components/VideoComparison.tsx` (the Progress Compare tab) filtered "analyzed" videos with a bare `v.analysis_status === 'complete' && v.analysis` truthiness check, then force-cast the result with `left.analysis!` — the exact same raw-shape crash as the plan page, just never previously hit because nobody had gotten 2+ two-clip videos analyzed while testing that specific tab. Fixed by filtering with `isStructuredAnalysis()` instead, verified live (a raw-shape pair no longer crashes the tab, correctly falls back to the "need 2+" placeholder). `app/api/videos/analyze/route.ts` (deprecated but still live) cast a prior video's `.analysis` straight to `VideoAnalysis` for use as AI-prompt "baseline" context — same crash risk one level removed, since `lib/openai.ts` then reads `baselineAnalysis.issues.map(...)`. Fixed the same way: a raw-shape prior video is now treated as "no baseline" rather than a lying cast. **Any code that reads the `analysis` field MUST apply `isStructuredAnalysis()` first** — treat this as a hard rule, not a suggestion. The 2026-07-19 sweep checked every `.analysis` read in the repo (both `*.ts` and `*.tsx`) and found no further unguarded instances — the one already-guarded read (`VideoAnalysisCard.tsx` itself) was the only other hit.

### 9. NEW — API keys pasted with embedded newlines break outbound HTTP calls
`OPENAI_API_KEY` on Railway was originally pasted with a literal newline character embedded mid-string (likely from a password manager or notes app that appended a trailing line break on copy). This produced `httpcore.LocalProtocolError: Illegal header value` on every OpenAI call — surfaced misleadingly as a generic `openai.APIConnectionError: Connection error` at the top level, which sent debugging down the wrong path (DNS/SSL) for a while before the real cause was found in the full traceback.

**Fix applied:** rotated to a new OpenAI key, re-pasted carefully (verified as a single line via a throwaway shell variable before pasting into Railway/Vercel), old key revoked on OpenAI's dashboard.

**When pasting any secret into Railway/Vercel/anywhere:** paste into a plain-text scratch variable first (e.g. `$test = "..."` in PowerShell, or any text editor) and visually confirm it's one continuous line with no line break before saving it as an env var.

### 10. Railway/Vercel deploys can silently fail during a GitHub outage
Encountered a real (brief) GitHub outage on 2026-07-16 that blocked both Vercel and Railway from pulling new commits, surfacing as a generic Vercel dashboard `502 Unexpected error`. Vercel's dashboard shows a "GitHub Outage" banner when this is the cause — check for it before assuming a deploy failure is project-specific. Resolved on its own within the same session once GitHub recovered; no project-side fix needed.

### 11. NEW — `DELETE` routes existed with zero ownership checks before 2026-07-17
`DELETE /api/players/[playerId]` and `DELETE /api/sessions/[sessionId]` both pre-dated this session and had **no ownership verification at all** — any caller who knew an id could delete any coach's player or session, and neither route touched Supabase Storage, silently orphaning every video file the row referenced. Discovered while building the hard-delete feature (build spec explicitly required ownership checks and storage-first cleanup); both routes were rewritten in place rather than left as dead insecure code. **If any other `DELETE`/mutating route is found that was written before this audit, assume it needs the same review** — verify ownership against a fresh DB read (never trust a client-supplied `coach_id`), and confirm it doesn't silently orphan Storage objects.

### 12. `ON DELETE SET NULL` doesn't bypass an append-only `BEFORE UPDATE` trigger
`consent_records` is append-only via `trg_consent_no_update` (`prevent_consent_update()`), which unconditionally rejects every `UPDATE`. Postgres implements a foreign key's `ON DELETE SET NULL` action as a real `UPDATE` on the referencing row — so simply changing `consent_records_player_id_fkey` from `CASCADE` to `SET NULL` (migration-v11) was **not sufficient by itself**; the trigger blocked the FK's own cascade, and deleting a player with any consent records failed outright with `"consent_records is append-only"`. Verified this failure live against a disposable test player before fixing it. Fix: the trigger function needed a narrow carve-out permitting only the exact shape of that one update (`player_id` transitioning to `NULL`, every other column unchanged) — see migration-v11's second `CREATE OR REPLACE FUNCTION`. **Any future FK pointing at an append-only/trigger-protected table needs the same check** — a constraint-level fix alone is not enough to verify; test the actual cascade against real data.

### 13. NEW — `getOrCreateCoach()` auto-vivified a `coaches` row for ANY URL, including bot crawlers
Before this session, `app/[coachId]/page.tsx`'s `getOrCreateCoach()` silently `INSERT`ed a `coaches` row for whatever string landed in the `[coachId]` URL segment — no validation, no auth, nothing. Discovered live: of 31 `coaches` rows, only 1 had a real name/email; the other 30 were bot-crawler noise (`favicon.ico`, `contact-us`, `pricing`, `impressum`, `kontakt`, etc. — literally every common path a crawler tried against the root domain). Removed entirely as part of adding real auth (see "Unified accounts" above) — `app/[coachId]/layout.tsx` now gates on a real session instead. **If any other dynamic route segment does a similar "look up or create" on first visit, check it for the same unauthenticated auto-vivify pattern.**

### 14. NEW — a stale legacy-format Supabase anon key in `.env.local` broke local auth entirely
`.env.local`'s `NEXT_PUBLIC_SUPABASE_ANON_KEY` was still the old `eyJhbGci...` legacy JWT key, disabled project-wide during an earlier key rotation (see Gotcha #9's era) — Vercel's deployed env var was correctly rotated to the new `sb_publishable_...` format, but the local file was never updated. Symptom: `signInWithPassword` failed with a real, correctly-formed but misleading-sounding error, `"Legacy API keys are disabled"` — easy to misread as an auth-logic bug rather than an env var problem. Fixed by pulling a current publishable key via the Supabase MCP `get_publishable_keys` tool and updating `.env.local` (gitignored, local-only — this fix doesn't touch anything committed or deployed). **If local auth fails with this exact error, check `.env.local`'s anon key format first** — `eyJ...` prefix means legacy/disabled, `sb_publishable_...` means current.

### 15. NEW — the append-only consent trigger also blocks `DELETE` cascades, not just `UPDATE`
Same family as Gotcha #12, different trigger: `trg_consent_no_delete` (`prevent_consent_delete()`) unconditionally rejects every `DELETE` on `consent_records`, including ones Postgres generates internally to satisfy an `ON DELETE CASCADE` from a parent table (`coaches`, `player_accounts`). Hit this live while cleaning up disposable test fixtures — deleting a test `coaches`/`player_accounts` row failed outright because it tried to cascade-delete that row's own `consent_records`. Not a bug to fix (the append-only guarantee is intentional and correct) — just a real operational gotcha: **cleaning up any coach or player_account row that has consent records requires temporarily disabling `trg_consent_no_delete`, deleting just those specific consent rows, then re-enabling the trigger before deleting the parent row** — same scoped-bypass pattern used for the migration-v11 verification work.

### 16. `/api/videos/presign` and `/api/videos/confirm` trusted client-supplied `coach_id` until 2026-07-19
The entire unified-accounts hardening pass (2026-07-18 — see Gotcha #11's lineage: `POST /api/players`, `PATCH`/`DELETE` on players and sessions) missed the upload path. Both routes took `coach_id` straight from the request body with zero verification — a coach could upload a video or photo into any other coach's player just by changing a request field, and the ownership check that existed (`.eq('id', playerId).eq('coach_id', coachId)`) also couldn't distinguish "player doesn't exist" from "player belongs to someone else," returning a blanket 404 for both. Found and fixed while building Feature A (photo upload) since the spec explicitly required the upload path to be session-derived. Fixed the same way as every other route in this lineage: `requireCoachSession()` for `coachId`, a fresh unfiltered `players` read, then an explicit `coach_id` comparison for a real 403. Verified live — a cross-owner presign attempt against a real (non-test) player id returned 403, not 404. `GET`/`PATCH`/`DELETE /api/videos/[videoId]` and `GET /api/videos` were audited during this same pass and found to have the identical no-ownership-check gap, deliberately left unfixed at the time (out of scope for "the upload path") — **closed the next day by the full audit in Gotcha #17.**

### 17. NEW — exhaustive route-ownership audit (2026-07-19): the client-trusted-`coachId` bug existed in half the API surface
Gotcha #16 (and #11 before it) each found the "trusts client-supplied `coach_id`" bug incidentally, one route at a time, while working on something else. A full read of every file in `app/api/` turned up **eleven more instances** of the same bug class, several worse than the ones already found:

- **Zero ownership check at all** (pure data leak or unauthenticated action): `GET /api/players/[playerId]`, `GET /api/sessions/[sessionId]`, `GET /api/coach`, `GET`/`PATCH`/`DELETE /api/videos/[videoId]` (the two routes Gotcha #16 explicitly deferred), `POST /api/players/[playerId]/resend-consent` (fully unauthenticated — anyone who knew a `playerId` could spam a parent's inbox).
- **`coachId` trusted from a query param**, scoping a list query with zero verification: `GET /api/videos` (the other route Gotcha #16 deferred), `GET /api/sessions`, `GET /api/training-plans`, `GET /api/progress`.
- **"Self-consistent pair" gap** (`coach_id`+`player_id` both client-supplied, only checked against *each other*, never against the actual caller — same shape as Gotcha #11/#16): `POST /api/sessions`, `POST /api/videos/upload` (deprecated single-clip route, but still live and reachable — nothing in the current UI calls it, but Next.js will happily route an external request to it).
- **No relationship check at all** — worse than self-consistent, since these didn't even verify `player_id` belonged to `coach_id`: `POST /api/training-plans`, `POST /api/progress`.
- **Ownership derivable only from the row itself** (deprecated route, no `coachId` param at all): `POST /api/videos/analyze` trusted `video_id` outright and could trigger paid OpenAI analysis plus mutate any linked session's `improvements`/`root_causes`/`strengths`. Fixed by fetching the video row first and deriving the owner (coach session or player-account JWT) from it — same pattern `DELETE /api/videos/[videoId]`'s new shared `checkOwnership()` helper uses.

**Deliberately left alone** — different, intentional trust models, not this bug class: `GET /api/admin/player-accounts` (`ADMIN_SECRET` header), `/api/player-accounts/me*` (JWT self-verification), `/api/consent/[token]` (unguessable 32-byte token *is* the credential, by design), `/api/inngest` (Inngest signing-key-gated by the `serve()` wrapper).

Fixed the same way throughout: `requireCoachSession()` derives `coachId` from the verified cookie session, replacing every client-supplied value; routes that only had a `videoId`/no coach param at all derive ownership by reading the row first. Also dropped the now-vestigial `?coachId=` query params from client `fetch()` calls (harmless to leave, but misleading — matches the cleanup already done for the delete buttons in the 2026-07-18 session).

**Verified live** with two real coach accounts (one owning a player/session/video/training-plan/progress-metric, one with nothing): every fixed route returns 403 or 404 for the non-owner and correct data for the owner; list endpoints confirmed to return genuinely empty arrays for a non-owner's filter (not leaked rows); `GET /api/coach?coachId=<spoofed>` confirmed to return the caller's *own* row, not the spoofed target's.

**One loose end, not a security hole:** `POST /api/sessions`, `/api/training-plans`, `/api/progress` return 404 (not 403) for a cross-owner `player_id`, since they use a single combined query rather than the fetch-then-compare split the other routes use. Cross-owner writes are still fully blocked — see Next Session Priority 5.

---

## What Was Fixed This Session (2026-07-19)

- **Feature A — analyzed stance photos** built end-to-end per `BUILD_SPEC_photo_upload.md`; see the "Analyzed stance photos — Feature A" architecture section above for full detail. Summary: `media_type` column on `session_videos` (migration-v13), photo MIME types accepted in `/presign`/`/confirm` with `media_type` derived server-side from the stored file's real extension, `TwoClipUpload.tsx` accepts photos and enforces same-media-type pairing (client + server backstop in the Inngest job), a second IMAGE-mode MediaPipe landmarker in the Python service, and `aggregate_single_frame_measurement()` which always reports `reliable: False` for a photo regardless of detection success — reusing (not duplicating) `/feedback`'s existing "if reliable is false" hedge.
- **`/api/videos/presign` and `/api/videos/confirm` ownership hardened** — see Gotcha #16. Found while building Feature A: both routes still trusted `coach_id` from the client body, the exact gap already closed everywhere else in the 2026-07-18 accounts session. Fixed identically (`requireCoachSession()` + fresh-read ownership check with a real 403 for cross-owner, not a masking 404). `GET`/`PATCH`/`DELETE /api/videos/[videoId]` and `GET /api/videos` have the same gap and were **not** fixed here — flagged below, not silently patched or silently ignored.
- **Verified live** (real photo pair uploaded through the actual authenticated path, real DB, real Storage — not just typechecked): `media_type: 'photo'` landed on both rows, Inngest fired identically to video, the Python service took the IMAGE branch, analysis showed `detection_rate: 1.0` but `reliable: false` (the conservative-by-design behavior working as intended), `/feedback` auto-generated and was visibly hedged on the single-frame input, `FeedbackCard` rendered it cleanly, a cross-owner presign attempt was refused with 403, and a player hard-delete removed both photo storage files with zero orphans. This also incidentally satisfies the long-outstanding "live end-to-end verification of auto-generated feedback" priority — the auto-generate-inline-in-`/analyse` path (built 2026-07-17) fired correctly during this test.
- **Feature B — reference photos** built end-to-end per `BUILD_SPEC_photo_upload.md`; see the "Reference photos — Feature B" architecture section above. Summary: new `reference_photos` table (migration-v14, mutually-exclusive-FK owner pattern, optional `session_id`), new `/api/reference-photos/{presign,confirm,[photoId]}` routes (session-derived ownership from day one), `ReferencePhotoUpload`/`ReferencePhotoGallery`/`ReferencePhotosSection` components deliberately separate from `TwoClipUpload.tsx`, wired into the player page, session page, and player's own dashboard. `DELETE /api/players/[playerId]` and `DELETE /api/sessions/[sessionId]` extended to storage-remove reference photos too (their DB rows cascade automatically via FK, but Storage objects don't).
- **Verified live**: coach upload at both player- and session-level with correct gallery scoping, cross-owner presign refused (403), standalone delete confirmed via `storage.objects` (not just the DB row), player hard-delete cascaded two attached reference photos with zero orphans, self-signup player upload/view/delete via JWT with cross-account `GET` refused (404), and confirmed a reference photo never creates a `session_videos` row.
- **Exhaustive route-ownership security audit** — see Gotcha #17 for the full list. Every file in `app/api/` read and classified; found and fixed eleven more instances of the client-trusted-`coachId` bug beyond the three already found incidentally this session (delete routes, `POST /api/players`, the upload path) — including the two routes Gotcha #16 explicitly deferred (`GET`/`PATCH`/`DELETE /api/videos/[videoId]`, `GET /api/videos`). Also swept every `.analysis` read in the repo for the Gotcha #8 shape-confusion bug and found two more unguarded instances (`VideoComparison.tsx`, the deprecated `/api/videos/analyze` route) — fixed both with `isStructuredAnalysis()`.
- **Verified live**: two real coach accounts, one owning a full set of resources (player/session/video/training-plan/progress-metric). Every fixed route confirmed to return 403/404 for the non-owning coach and correct data for the owner; list endpoints confirmed to return genuinely empty results for a non-owner (not leaked rows); a spoofed `?coachId=` query param confirmed to be fully ignored. The `VideoComparison.tsx` fix confirmed live against two raw-shape (non-structured) analyzed videos — no crash, correct fallback to the "need 2+" placeholder.

---

## What's Still Outstanding

**No coach password-reset flow** — see Next Session Priority 1. Coaches have real passwords now with no way to recover a forgotten one; players have the same pre-existing gap.

**Legacy `coaches` rows (~30) are permanently inert** — see Next Session Priority 2. Explicit owner decision as of 2026-07-18, not a bug. Mostly bot-crawler noise from the `getOrCreateCoach()` auto-vivify bug (Gotcha #13); left as-is, not migrated.

**Identity linking/merging (player↔coach)** — deliberately not built this session, per explicit scope boundary. "Coach links to an existing player account" is a real future need but was pinned pending subscription decisions; a coachless player must remain (and does remain) fully functional on its own.

**Subscriptions/billing/player limits** — explicitly out of scope for the accounts work; no design started.

**Google sign-in** — still just scoped/designed conceptually (from earlier in this broader session), not built. Should stay compatible with the new unified accounts model when it is eventually built — same derived-role approach should extend cleanly since it keys off `auth_user_id`, not a stored role string.

**Why is `position` NULL on some tested sessions** — still open. Now safe-to-serve regardless (the 2026-07-17 hedging fix), but the root cause is still unknown.

**`/feedback` output shape divergence from original plan** — see Next Session Priority 3.

**Fault taxonomy — understood to be two axes, not one** — see Next Session Priority 4. Positions beyond OL, *and* technique beyond stance, both need calibration rules from scratch.

**`ADMIN_SECRET` should be rotated** — exposed in a debugging screenshot during the 2026-07-17 session. Still not done.

**Resend custom domain** — unchanged, still outstanding. All transactional emails send from `onboarding@resend.dev`.

**Front-view biomechanical analysis** — unchanged, still skipped entirely by the Python service.

**`supabase/migration-v3-drills-feedback.sql` unapplied, safe to delete** — unchanged from prior sessions.

**Session list ordering on player detail page lacks clear timestamp indication** — unchanged, low priority.

---

## Key File Reference

| File | Purpose |
|---|---|
| `lib/supabase.ts` | Browser Supabase client. **Changed 2026-07-18** — `getSupabaseClient()` now uses `createBrowserClient` from `@supabase/ssr` (cookie-based sessions) instead of `@supabase/supabase-js`'s `createClient` (localStorage-only). Also exports `getAdminClient()` (service-role, unchanged). |
| `lib/supabase-server.ts` | **New, 2026-07-18.** Server-side Supabase client (`getServerSupabase()`) and `getServerUser()`, reading the session from cookies via `next/headers`. Enables real server-side "who is this" checks for the first time. |
| `middleware.ts` | **New, 2026-07-18.** Standard Supabase SSR session-refresh boilerplate. Deliberately narrow — refresh only, no auth-gating logic (that lives in `app/[coachId]/layout.tsx`). Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `/api/*`. |
| `lib/auth-role.ts` | **New, 2026-07-18.** `resolveRole(authUserId)` — the single source of truth for coach-vs-player role, derived (not stored) by checking which table (`coaches` vs `player_accounts`) holds the caller's `auth_user_id`. Used by `/api/whoami` and `lib/require-coach.ts`. |
| `lib/require-coach.ts` | **New, 2026-07-18.** `requireCoachSession()` — reusable API-route helper, derives `coachId` from the verified session (401 if unauthenticated, 403 if authenticated but not a coach). Used by every strengthened ownership check this session. |
| `app/[coachId]/layout.tsx` | **Rewritten 2026-07-18.** The real security boundary for every page under `/[coachId]/...` — unauthenticated → `/login`, authenticated player → `/player/dashboard`, authenticated coach at the wrong `coachId` → redirected to their own. Previously had no auth check at all. |
| `app/signup/page.tsx` | **New, 2026-07-18.** Unified sign-up entry point — role picker renders `CoachSignupForm` or `PlayerSignupForm`. |
| `app/login/page.tsx` | **New, 2026-07-18.** Unified login — `signInWithPassword` then `GET /api/whoami` to route to `/${coachId}` or `/player/dashboard`. |
| `components/CoachSignupForm.tsx` | **New, 2026-07-18.** Coach signup form (name, team_name, email, password, terms), calls `POST /api/coaches/signup`. |
| `components/PlayerSignupForm.tsx` | **New, 2026-07-18.** Extracted from the old `app/player/signup/page.tsx`; unchanged logic (minor detection, parent-email validation), calls the pre-existing `POST /api/player-accounts`. |
| `app/api/coaches/signup/route.ts` | **New, 2026-07-18.** First real coach account creation endpoint — `auth.admin.createUser` + `coaches` row (with `auth_user_id`) + consent records + verification email, rolls back the auth user on DB insert failure. |
| `app/api/whoami/route.ts` | **New, 2026-07-18.** `GET`, verifies a bearer JWT, returns the resolved role (`coach`+`coachId` or `player`+`playerAccountId`) or 404. |
| `app/api/coach/route.ts` | `POST` **removed 2026-07-18** — the old anonymous "Coach ID is your password" creation path, superseded by `POST /api/coaches/signup` (see Gotcha #13's sibling fix). `PATCH` now derives `coachId` from `requireCoachSession()` instead of trusting `body.coachId`. **`GET` hardened 2026-07-19** (Gotcha #17) — previously took `coachId` from a query param with zero check (leaked coach email/name); now session-derived, ignores the query param entirely. |
| `app/[coachId]/page.tsx` | **Changed 2026-07-18** — `getOrCreateCoach()` removed entirely (see Gotcha #13); now a direct, defensive `.select()` since the layout already guarantees this `coachId` belongs to the authenticated coach. |
| `app/player/signup/page.tsx`, `app/player/login/page.tsx` | **Changed 2026-07-18** — now trivial redirects to `/signup`/`/login`, kept only for bookmark compatibility. |
| `app/page.tsx` | **Changed 2026-07-18** — landing page; removed the old anonymous "Start Coaching" flow and coach-ID resume input, now links to `/signup`/`/login`. |
| `app/api/players/route.ts` | **Changed 2026-07-18** — `POST` previously trusted `body.coach_id` from the client with zero verification (real vulnerability, found this session); now derives `coachId` via `requireCoachSession()`. `GET` similarly switched from a `coachId` query param to session-derived. |
| `app/api/players/[playerId]/route.ts` | GET/PATCH/**DELETE**. `DELETE` rewritten 2026-07-17 — see Gotcha #11. **`PATCH` gained an ownership check 2026-07-18** (previously had none — closed the outstanding audit item from 2026-07-17). `DELETE` switched from query-param to session-derived `coachId`. **Changed 2026-07-19** (two passes) — `DELETE`'s storage-first cascade also gathers and removes `reference_photos` files now (Feature B); response field renamed `deletedVideoFiles` → `deletedFiles`. Then (Gotcha #17) `GET` hardened — previously had zero ownership check at all (leaked name/DOB/parent_email for any `playerId`); now session-derived with a real 403. |
| `app/api/sessions/[sessionId]/route.ts` | GET/PATCH/**DELETE**. Same treatment as the player route — `PATCH` gained an ownership check 2026-07-18, `DELETE` switched to session-derived `coachId`. **Changed 2026-07-19** — same `reference_photos` cascade extension as the player route, then (Gotcha #17) `GET` hardened the same way as `GET /api/players/[playerId]`. |
| `app/api/sessions/route.ts` | GET/**POST**. **Changed 2026-07-19** (Gotcha #17) — `GET` previously trusted `coachId` from a query param (leaked session notes/strengths/improvements for any coach); now session-derived. `POST` previously trusted `coach_id` from the body, only checking it was *internally consistent* with `player_id`, never that the caller actually was that coach (the "self-consistent pair" gap, same class as Gotcha #11/#16); now derives `coachId` from the session and re-verifies `player_id` against it. |
| `app/api/videos/[videoId]/route.ts` | GET/PATCH/**DELETE**. **Hardened 2026-07-19** (Gotcha #17 — this was one of the two routes Gotcha #16 explicitly deferred). Previously zero ownership check on any method — any caller who knew a `videoId` could read a signed playback URL, edit, or delete any coach's video/photo. No `coachId` is supplied directly here, so a shared `checkOwnership()` helper derives it from the row itself (`coach_id` → session check, `player_account_id` → JWT self-check), reused by all three methods. `DELETE` also picked up the storage-first abort-on-failure discipline the players/sessions delete routes already had. |
| `app/api/videos/route.ts` | `GET` — **hardened 2026-07-19** (Gotcha #17, the other route Gotcha #16 deferred). Previously trusted `coachId` from a query param with zero verification, listing every video (with fresh signed URLs) for any coach whose id you knew. Now session-derived; `playerId`/`sessionId` remain pure filters on top. |
| `app/api/videos/upload/route.ts` | **Deprecated** — no longer called by any UI, but still a live, reachable endpoint. **Hardened 2026-07-19** (Gotcha #17) — had the same "self-consistent pair" gap as the pre-fix `/presign`; now derives `coachId` from `requireCoachSession()` for the coach-managed path. |
| `app/api/videos/analyze/route.ts` | **Deprecated 2026-07-14** — single-clip GPT-4o vision; kept for reference, still live. **Hardened 2026-07-19** (Gotcha #17) — had zero ownership check on `video_id` (could trigger paid analysis and mutate any session via any video id); ownership now derived from the video row itself. Also fixed an unguarded `.analysis` cast used as AI "baseline" context (Gotcha #8's fourth hit) — a raw-shape prior video is now treated as no-baseline instead of a lying cast. |
| `app/api/training-plans/route.ts` | GET/**POST**. **Changed 2026-07-19** (Gotcha #17) — `GET` previously trusted `coachId` from a query param (leaked pain points/exercises for any coach); now session-derived. `POST` previously trusted BOTH `coach_id` and `player_id` from the body with **no relationship check at all** (worse than the self-consistent-pair gap — didn't even verify the pair matched); now derives `coachId` from the session and verifies `player_id` belongs to it. |
| `app/api/progress/route.ts` | GET/**POST**. Same treatment as `/api/training-plans` in the same pass — `GET` was query-param `coachId`, `POST` trusted `coach_id`+`player_id` with no relationship check. Both session-derived now. |
| `app/api/players/[playerId]/resend-consent/route.ts` | **Hardened 2026-07-19** (Gotcha #17) — had **no authentication at all**; anyone who knew or guessed a `playerId` could trigger a resend email to that player's parent, with no rate limit (spam/abuse vector). Now requires `requireCoachSession()` + ownership check like every other player-scoped mutation. |
| `components/Navigation.tsx` | **Changed 2026-07-18** — added a "Log out" button (coaches previously had no session to sign out of). |
| `components/DeletePlayerButton.tsx`, `components/DeleteSessionButton.tsx` | **Changed 2026-07-18** — dropped the `?coachId=...` query param from their `fetch()` calls; the strengthened routes derive it from the session cookie instead. |
| `supabase/migration-v12-coaches-auth-user-id.sql` | **New, applied, 2026-07-18.** Additive, nullable, unique `coaches.auth_user_id UUID REFERENCES auth.users(id)`. |
| `service/main.py` | Python analysis service: FastAPI endpoints, MediaPipe processing, Supabase writes, sb_secret_ fix, `/feedback` route + `require_admin` dependency, auto-generates feedback inline inside `/analyse` (best-effort, try/except-wrapped, skipped on zero-detection). **Changed 2026-07-19** — loads a second `PoseLandmarker` in IMAGE mode at startup (`_landmarker_image`), `AnalyseRequest.media_type` branches `/analyse` between `process_video_side()`/`process_image_side()`, `/health` reports both landmarkers. |
| `service/feedback.py` | Builds the GPT-4o-mini prompt from raw measurements + fault_type/line_side/position, calls OpenAI, returns structured feedback. Zero-detection fallback guard. All three of fault_type/line_side/position are Optional — `None` gets an explicit "UNKNOWN, do not guess" cue rather than a silently-substituted default (the 2026-07-17 hedging fix). No `overall_grade` as of 2026-07-17 (owner decision — removed, not hidden). **Changed 2026-07-19** — `_measurements_summary()`'s `reliable` parenthetical generalized so it stays accurate for both video (detection-rate-driven) and photo (always-conservative) inputs. |
| `service/pose_utils.py` | MediaPipe pose landmark extraction, side-view slope calculation. **Changed 2026-07-19** — added `load_model_image()`/`process_image_side()`, an IMAGE-mode counterpart to `load_model()`/`process_video_side()` for Feature A (analyzed stance photos). Separate landmarker instance — MediaPipe's running mode is fixed at creation. |
| `service/measurements.py` | `aggregate_side_measurements()` — filters frames, computes slope stats. **Changed 2026-07-19** — added `aggregate_single_frame_measurement()` for photos; deliberately does NOT reuse the `detection_rate >= 0.5` reliable formula, always returns `reliable: False` by design. |
| `supabase/migration-v10-feedback-column.sql` | **New, applied.** Adds `feedback` JSONB column to `session_videos`. |
| `supabase/migration-v11-consent-retain-on-player-delete.sql` | **New, applied.** Changes `consent_records_player_id_fkey` to `ON DELETE SET NULL` and patches the `prevent_consent_update()` trigger to allow that one specific cascade update — see Gotcha #12. |
| `supabase/migration-v13-media-type.sql` | **New, applied, 2026-07-19.** Additive, `NOT NULL DEFAULT 'video'`, `media_type TEXT CHECK IN ('video','photo')` on `session_videos`. Enables Feature A. |
| `components/DeletePlayerButton.tsx` | **New.** `window.confirm()` naming the player + session count, calls `DELETE /api/players/[playerId]`. Wired into the player detail page header. |
| `components/DeleteSessionButton.tsx` | **New.** `window.confirm()` naming the session date, calls `DELETE /api/sessions/[sessionId]`. Wired into the session detail page header. |
| `app/api/videos/presign/route.ts` | Step 1 of upload: consent gate + signed URL issuance. **Changed 2026-07-19** — accepts `image/jpeg`/`image/png` (20MB cap, vs video's 500MB), and ownership hardened: `coachId` now derived from `requireCoachSession()` instead of trusted from the body, with a real 403 (not a masking 404) for a cross-owner `playerId` — see Gotcha #16. |
| `app/api/videos/confirm/route.ts` | Step 2 of upload: DB row insert + paired-clip check + Inngest fire. **Changed 2026-07-19** — same ownership hardening as `/presign`; `deriveMediaType()` sets `media_type` from the stored file's real extension, never client-supplied. |
| `lib/openai.ts` | OpenAI client (Next.js side); `generateTrainingPlanAI()` (active); `analyzeVideoFrames()` (deprecated) |
| `lib/inngest.ts` | Inngest client, app ID `practice-field` |
| `lib/jobs/ol-stance-analysis.ts` | Inngest function: validates session, marks processing, calls Python /analyse. **Changed 2026-07-19** — `validate-session` now also reads `media_type` and rejects (`NonRetriableError`) a side/front pair with mismatched media types, a fresh-DB-read backstop behind `TwoClipUpload.tsx`'s client-side check; passes `media_type` through to `/analyse`. |
| `lib/server-frames.ts` | **Deprecated 2026-07-14** — FFmpeg frame extraction for single-clip path; kept for reference |
| `components/VideoAnalysisCard.tsx` | Renders structured VideoAnalysis; raw Python measurements now show a "feedback pending" placeholder instead of a raw dump (2026-07-17). Exports `isStructuredAnalysis()` — reused by the plan page and (as of 2026-07-19) `VideoComparison.tsx`. **Changed 2026-07-19** — small 📷/🎬 badge next to the clip label reflecting `video.media_type`. |
| `components/VideoComparison.tsx` | Renders the Progress Compare tab (side-by-side grade/score/issue diff between two analyzed videos). **Fixed 2026-07-19** — see Gotcha #8's "bitten four times" note: used to filter "analyzed" videos with a bare `analysis` truthiness check, then force-cast with `!`, crashing on the two-clip pipeline's raw measurement shape. Now filters with `isStructuredAnalysis()`. |
| `components/FeedbackCard.tsx` | Renders the `feedback` column (GPT-4o output) on the session results page. Returns `null` if `feedback` is null. No grade badge as of 2026-07-17. |
| `components/SessionAutoRefresh.tsx` | **New.** Client island, polls via `router.refresh()` while a side video's `analysis_status` isn't yet terminal; stops on `complete`/`failed` with one grace poll to catch fast-follow feedback. Renders nothing. |
| `components/VideoUpload.tsx` | **Deprecated 2026-07-14** — single-clip upload UI; no longer rendered |
| `components/TwoClipUpload.tsx` | Two-clip OL stance upload UI: presign → Storage PUT → confirm (×2). **Changed 2026-07-19** — accepts `image/jpeg`/`image/png` alongside video (20MB cap), enforces both slots being the same media type client-side (`establishedMediaType()`), 📷/🎬 icons. |
| `app/[coachId]/players/[playerId]/sessions/[sessionId]/page.tsx` | Session results page — `force-dynamic`, fetches videos, renders `VideoAnalysisCard` + `FeedbackCard` per drill, plus `SessionAutoRefresh` for live updates. **Changed 2026-07-19** — also fetches and renders `ReferencePhotosSection` scoped to this session. |
| `app/[coachId]/players/[playerId]/page.tsx` | Player detail page — stats, progress charts, latest training plan, session history. **Changed 2026-07-19** — fetches and renders `ReferencePhotosSection` scoped to this player. |
| `app/player/dashboard/page.tsx` | Self-signup player's own dashboard (video upload, account-status gating). **Changed 2026-07-19** — fetches and renders `ReferencePhotosSection` via the player-account JWT path. |
| `app/[coachId]/players/[playerId]/plan/page.tsx` | Virtual Training Coach plan builder. **Fixed 2026-07-17** — crashed for essentially every player reading `analysis.issues` without `isStructuredAnalysis()`; see Gotcha #8. |
| `app/[coachId]/players/[playerId]/videos/page.tsx` | Coach video library + upload tab (two-clip only as of 2026-07-14) |
| `app/api/inngest/route.ts` | Inngest serve endpoint — must be synced manually in Inngest dashboard after deploy |
| `app/api/reference-photos/presign/route.ts`, `confirm/route.ts` | **New, 2026-07-19 (Feature B).** Same direct-to-storage pattern as `/api/videos/*`, session-derived ownership from day one, reuses the coach-managed consent gate. No `view_angle`, no pairing, no `drill_type` — deliberately simpler than the analysis upload path. |
| `app/api/reference-photos/route.ts` | **New, 2026-07-19.** `GET` list — coach query-param convention (matches `GET /api/videos`) or player-account JWT self-view. |
| `app/api/reference-photos/[photoId]/route.ts` | **New, 2026-07-19.** `DELETE` — storage-first, ownership-checked (coach-managed via session, self-signup via JWT). |
| `components/ReferencePhotoUpload.tsx`, `ReferencePhotoGallery.tsx`, `ReferencePhotosSection.tsx` | **New, 2026-07-19 (Feature B).** Deliberately separate from `TwoClipUpload.tsx` — a single-control "not analyzed" upload, a labeled thumbnail gallery with click-to-enlarge, and the client-island wrapper combining both, wired into the player page, session page, and player's own dashboard. |
| `supabase/migration-v14-reference-photos.sql` | **New, applied, 2026-07-19.** `reference_photos` table — mutually-exclusive owner FK pattern (`chk_rp_has_owner`), optional `session_id`. |
| `types/index.ts` | `VideoAnalysis`, `SessionVideo` (includes `view_angle`, `media_type: 'video' \| 'photo'` as of 2026-07-19, `feedback: StanceFeedback \| null`), `AnalysisStatus`, `StanceFeedback`/`StanceFeedbackIssue` (matches `service/feedback.py`'s actual output shape — no `overall_grade` as of 2026-07-17; `OverallGrade` type still exists, used by `VideoAnalysis` only), `ReferencePhoto` (**new, 2026-07-19**) |
| `service/Dockerfile` | Railway container — includes libgles2/libegl1, wget for model, ENV MODEL_PATH |
| `service/requirements.txt` | Pinned exact versions (mediapipe==0.10.35, supabase==2.31.0, openai==1.59.6, etc.) |
| `.claude/launch.json` | **New.** Dev server launch config (`npm run dev`, port 3000) for browser preview tooling. |

## Environment Variables (complete list)

**Local dev (`.env.local`, gitignored):** mirrors the Vercel list below. **Fixed 2026-07-18** — `NEXT_PUBLIC_SUPABASE_ANON_KEY` had drifted to a stale legacy-JWT-format key (disabled project-wide), even though Vercel's deployed value was already correctly rotated. See Gotcha #14. If local login ever fails with `"Legacy API keys are disabled"`, check this file's key format first (`sb_publishable_...` = current, `eyJ...` = stale/disabled).

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

# Practice Field — Claude Code Context

> Last updated: 2026-07-20 (Password reset flow — "forgot password" now exists for every account type, built on Supabase Auth's native recovery; documented below under "Password reset". Gated on the deferred email-delivery workstream for real-user use. Earlier the same day: Solo-player analysis access + Position capture build — solo players can now run the two-clip analysis pipeline from their own dashboard, and the OL-stance position (guard_tackle/center) is captured as a profile default + per-session override and flows through to the feedback prompt. Documented below under "Solo analysis access + position capture". Prior work — pipeline hardening, photo Features A & B, the route-ownership audit — is below that.)

## Next Session Priorities

1. **~~No "forgot password" flow~~ — BUILT + FIXED 2026-07-20** (see "Password reset" below). Works for coaches AND players from one entry point; the production redirect is correctly allow-listed. A real bug found after first ship (the implicit-hash credential was never consumed, so every reset showed "invalid or expired") is fixed and re-verified against a production build. Remaining gap for real users: **email delivery** (deferred workstream — see "Email delivery" below).

2. **Legacy `coaches` rows (~30) are permanently inert under the new auth model** — by explicit owner decision (2026-07-18), not migrated, not backfilled. Most are bot-crawler noise (`favicon.ico`, `contact-us`, etc. — see Gotcha #13). Not a bug — a decision.

3. **`/feedback` output shape — still partially undecided.** Unchanged from before — see "What's Still Outstanding" below.

4. **Fault taxonomy expansion** — unchanged, still deferred pending calibration data. See "What's Still Outstanding" below.

5. **`POST /api/sessions`, `/api/training-plans`, `/api/progress` return 404 (not 403) for a cross-owner `player_id`.** Minor consistency gap left by the 2026-07-19 audit — these three use a single combined `.eq('id', playerId).eq('coach_id', coachId)` query rather than the fetch-then-compare 404-vs-403 split used everywhere else (delete routes, `/presign`, `/confirm`, the other GET-by-id routes). Not a security hole — cross-owner writes are still fully blocked, confirmed live — just an inconsistent error code. Low priority polish.

6. **~~`position` is never captured~~ — DONE 2026-07-20.** The OL-stance analysis position (`guard_tackle`/`center`) is now captured as a profile default + per-session override and flows to the feedback prompt. See "Solo analysis access + position capture" below. Note for the owner (flagged, not a bug): with a real position now present, feedback **resumes position-aware language** (e.g. "critical for a guard or tackle's performance") — grounded in the captured value, not fabricated, and still hedged when reliability is low. This is expected/acceptable until the calibration ruleset exists. `line_side`/`fault_type` remain uncaptured **by design** (Step 0 finding: `line_side` has no computational consumer; `fault_type` is an analysis output/calibration label, not an input).

7. **No pipeline monitoring/alerting exists.** A failed analysis or feedback generation now writes a terminal `failed` state that the UI surfaces (Items 2 & 5), but nothing *notifies* anyone — no error aggregation, no alert on a stuck/failed run. Recommended minimal cheap approach in "Pipeline hardening" §Item 5 below. Not built (out of scope for this pass); flagged for a decision.

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

## Password reset (2026-07-20)

Before this, there was **no reset path at all** — a forgotten password meant permanent lockout for coaches and players alike. This wires up Supabase Auth's native recovery; it is UI + wiring, not a custom token system.

### One flow serves every account type — confirmed, not assumed

Coaches and players authenticate identically: both are plain rows in `auth.users` (coaches gained `auth_user_id` in migration-v12; `player_accounts` always had one). They differ only in *which profile table references the auth user*, which password recovery never touches. So a single `resetPasswordForEmail` entry point on the unified `/login` covers both — **verified live against a real coach account and a real solo player account**, not inferred.

### The pages

- **`app/forgot-password/page.tsx`** — email → `resetPasswordForEmail(email, { redirectTo: <origin>/reset-password })`.
  **Anti-enumeration:** the "If an account exists for that email, a reset link has been sent" confirmation renders **unconditionally** — same text, same code path, even when Supabase returns an error (the `catch` deliberately swallows). Rendering anything different for a non-existent address would turn this form into an account-existence oracle. Verified live: registered vs unregistered email produce byte-identical output.
- **`app/reset-password/page.tsx`** — the `redirectTo` target. Establishes the recovery session, then `updateUser({ password })`, then **`signOut()`** so no half-authenticated recovery session is left behind (the user signs in fresh).

### Why the reset page handles three token shapes (don't "simplify" this)

Supabase delivers the recovery credential differently depending on how the link was created, so the page handles all three explicitly:

| Shape | When it appears | Handled by |
|---|---|---|
| `?code=…` | PKCE — what `resetPasswordForEmail()` produces from the browser client (`@supabase/ssr`'s `createBrowserClient` uses PKCE), because a code verifier was stashed locally. **This is the production path once email is live.** | `exchangeCodeForSession()` |
| `?token_hash=…&type=recovery` | The verify-endpoint shape | `verifyOtp()` |
| `#access_token=…` | Implicit — what an **admin-generated** link (`auth.admin.generateLink`, no local verifier) redirects with | `detectSessionInUrl` consumes it; the page polls for the session |

Handling only one would work in dev and break in production (or vice-versa). **Note the asymmetry this creates for testing:** admin-generated links (the only ones obtainable while email is deferred) exercise the `token_hash`/implicit paths, *not* the PKCE `?code` path that will actually run in production — see the verification caveat below.

**Guarding:** no credential in the URL → the friendly "invalid or expired" state, **including when the visitor is already logged in**, so the page can't be used as a no-token password-change backdoor. The credential is scrubbed from the URL via `history.replaceState` once consumed, so it isn't left in the address bar, history, or a later `Referer`.

### Password rules — `lib/password.ts`

The min-8 rule was previously duplicated inline in `CoachSignupForm`, `PlayerSignupForm`, and both signup API routes. It now lives in `lib/password.ts` (`MIN_PASSWORD_LENGTH`, `validatePassword`, `isPasswordValid`, `PASSWORD_REQUIREMENT`) and both signup forms plus the reset page import it, so signup and reset can't drift. **The server routes remain authoritative** (`password.length < 8` → 400 in `/api/coaches/signup` and `/api/player-accounts`) — the shared lib is the client half of the same contract, not a security control. Change the rule in both places.

### Redirect URLs allow-list — production is fine, localhost is not

`redirectTo` is only honored if the exact URL is on the project's Redirect URLs allow-list ([Supabase docs](https://supabase.com/docs/guides/auth/redirect-urls)); otherwise Supabase silently falls back to the Site URL.

**Verified 2026-07-20:** `https://practice-field.vercel.app/reset-password` **IS** allow-listed and honored — production is correctly configured, no action needed. (An earlier note in this file claimed otherwise; that was wrong — the fallback observed was for `http://localhost:3000/reset-password`, which is *not* allow-listed.)

**Only if you want the flow to work against local dev**, add `http://localhost:3000/**` to Authentication → URL Configuration → Redirect URLs. Not required for production.

### 🐞 The bug that broke this in production (fixed 2026-07-20)

**Symptom:** reset email arrived, the link was clicked, and `/reset-password` showed "This link is invalid or has expired" — every time, for everyone.

**Root cause:** Supabase's recovery redirect delivers the credential in the **URL hash** (verified against the live verify endpoint — the `Location` header is `…/reset-password#access_token=…&refresh_token=…&type=recovery`). The original page *passively waited* for `detectSessionInUrl` to consume that hash. But `createBrowserClient` (`@supabase/ssr`) runs in **PKCE mode**, where the client is looking for `?code=` and never consumes an implicit hash — so the polled-for session never appeared and the page fell through to the "invalid or expired" state.

**Fix:** the hash branch now calls `supabase.auth.setSession({ access_token, refresh_token })` **explicitly** instead of waiting for the client's own URL detection.

**Why the original verification missed it:** the pre-fix testing exercised the `?token_hash=` branch (via `verifyOtp`), which bypasses URL detection entirely and therefore passed — while the shape production actually delivers (implicit hash) was never exercised. **Lesson: verify the shape the real redirect produces, not a shape that's merely easy to construct.** The live `Location` header is the ground truth; check it with `curl -D -` against a generated link rather than assuming.

**Re-verified after the fix** (dev server *and* a real `next build` production build): a genuine Supabase recovery redirect now renders the form, and completing it changed the password for real — old password rejected, new accepted.

### Verified live (2026-07-20)

Disposable coach + solo player accounts; recovery links obtained via `auth.admin.generateLink({ type: 'recovery' })` since email doesn't deliver yet. For **both** account types: link produced → reset page accepted it → new password set → **old password rejected, new password accepted** (confirmed via real `signInWithPassword`). Also confirmed: replaying a used link → friendly "invalid or expired" (single-use intact); a direct visit with no token → same friendly state; a bogus `?code=` → same friendly state, no crash or hang; min-8 and passwords-match validation both enforced; registered vs unregistered email indistinguishable; computed styles match the brand system exactly (`#EC3D50` action, brand gradient, `#1C1830`/`#3A3050` inputs, 6px radii); zero console errors. Disposable accounts cleaned up (zero-count sweep).

**Verification caveat (honest gap):** the PKCE `?code` success path is still unverified — a real PKCE link requires a delivered email (an admin-generated link carries no code verifier and yields the implicit-hash shape, which is what production was actually observed to deliver). Its *failure* path is verified (bogus code → friendly error, no hang). **Re-verify when email delivery lands** — and note the 2026-07-20 bug below is exactly the class of thing this gap hides, so treat it as a real risk, not a formality.

### Email delivery — the deferred dependency

Password reset only reaches real users once email delivery is enabled. Today Resend sends from `onboarding@resend.dev`, which delivers **only to pre-approved addresses** — so a real user will not receive a reset email. This is expected and was explicitly out of scope for this build.

**This joins the deferred EMAIL workstream.** When email delivery is switched on (custom Resend domain — see "Resend custom domain" in What's Still Outstanding — likely bundled with the minor-consent email work pending legal input), **both password reset and minor-consent emails become live at once and both should be re-verified with real delivery at that point**, together with the PKCE caveat and the Redirect-URL config step above.

## Solo analysis access + position capture (2026-07-20)

Two linked pieces from one build spec, committed separately.

### Step 0 finding — what the three metadata fields actually are

Read the code before building capture. There are **two distinct "position" concepts**, which the spec (written without awareness of this) conflated:

- **Profile position** — `players.position` / `player_accounts.position` — the broad `FootballPosition` roster taxonomy (`QB`/`OL`/`C`/`OG`/`OT`/…), free-text (no CHECK), used for training-plan drill selection. Coach-created players **already** captured this on the add-player form; solo accounts had no such column until migration-v16.
- **Analysis stance-position** — `sessions.position` (new, v16) / `session_videos.position` — CHECK-constrained to exactly **`guard_tackle` | `center`**, the *only* position vocabulary the OL-stance feedback prompt (`service/feedback.py` `POSITION_CUES`) consumes. This was **genuinely never captured** — the real gap.
- **`line_side`** (`left`/`right`): **no computational consumer** — `pose_utils.py` never reads it, there's no mirror-imaging anywhere; it's only a text cue in the prompt, and stance handedness is already *derived* from the video (`down_hand_majority`). → **no capture UI**, stays null.
- **`fault_type`**: a calibration label / future analysis **output** (the fault a clip demonstrates or that the deferred ruleset will detect), not an analysis-time input. → **no capture UI**, stays null.

**Design decision (proceeded on the recommended default; owner didn't pick):** the per-session analysis position (`guard_tackle`/`center`) **defaults from the broad profile position via a deterministic mapping** (`lib/position.ts` `mapToStancePosition`: `C`→`center`, `OG`/`OT`→`guard_tackle`, else unset) and is overridable per session. Kept the broad `FootballPosition` as the single profile field rather than adding a redundant stance-position profile field.

### Part 1 — solo player analysis access

Solo (`player_accounts`) players had no UI path to the two-clip pipeline — the dashboard only offered the deprecated single-clip `/api/videos/upload` (no `view_angle` → never paired, never analyzed). Backend already supported solo end-to-end; this was pure UI wiring.

- **`app/player/dashboard/page.tsx`** rewired: the single-clip upload is **gone** (dead-end no longer reachable), replaced by a "Stance Analysis" flow — create a solo session (`player_account_id`, JWT-authed `POST /api/sessions`), then the real `TwoClipUpload` (photos + video), then a "My Sessions" list linking to results.
- **`app/player/sessions/[sessionId]/page.tsx`** (new) — the solo results view mirroring the coach session page (`VideoAnalysisCard` + `FeedbackPanel` + `FrontMeasurements`), a **client** page that polls itself to completion.
- **`GET /api/player-accounts/me/sessions`** and **`.../sessions/[sessionId]`** (new) — JWT-owned; the single-session route returns 404 for a session that isn't yours (the `/me` convention).
- **Bug fixed during the build:** `TwoClipUpload`'s **confirm** call didn't forward the auth token (only presign did) — fine for coaches (cookie), but the solo `player_account_id` path in `/confirm` is JWT-authed, so confirm 401'd. Now forwards it. Also `FeedbackPanel` gained an `onRetried` callback so a client page re-fetches after a retry (`router.refresh()` only re-runs server components).

### Part 2 — position capture (both flows, identical)

- **Profile capture:** solo signup gained a position `<select>` (`POST /api/player-accounts` stores it); solo profile editable on the dashboard via new **`PATCH /api/player-accounts/me`**; coach players editable on the detail page via new **`PlayerPositionEditor`** island (→ existing `PATCH /api/players/[id]`). `FOOTBALL_POSITIONS` centralized in `lib/position.ts`.
- **Per-session capture:** a `guard_tackle`/`center` selector at session start in **both** flows, defaulted from the profile via `mapToStancePosition`, overridable, stored on `sessions.position` (validated in `POST /api/sessions`).
- **Plumbing:** `lib/jobs/ol-stance-analysis.ts`'s `validate-session` step now reads `sessions.position` on its fresh DB read and passes it to `/analyse` (replacing the old event-payload passthrough that always sent null); `/analyse` writes it to `session_videos.position` where feedback reads it. **Bug fixed during the build:** the job read `sessions.position` into its `clips` object but the `/analyse` body still used `data.position` (event payload) — position never flowed until that line used `clips.position`.
- **History integrity** (the load-bearing correctness point): the per-session position is a **snapshot on the session row**, independent of the profile column. Verified live — editing a player's profile position leaves an existing session's `position` (and its `session_videos.position`) unchanged.
- **Coach-flow bug fixed:** `createOlSession` was a `useCallback` whose deps omitted `stancePosition`, so it captured the initial `''` → sessions got `position: null` regardless of the selector (stale closure). Added `stancePosition` to the deps. (The solo handler is a plain function, so it was unaffected.)

### Verified live (real accounts, real DB/Storage, through the actual UI)

Solo photo pair uploaded through the real dashboard → `TwoClipUpload` → pipeline → **auto-feedback rendered on the results page with zero manual intervention**; `sessions.position` and `session_videos.position` both carried the captured value; feedback became position-aware and accurately grounded. Coach path: selector defaulted from the player's profile (`C`→Center) and an override (→Guard/Tackle) landed on the session row. Profile edit via UI worked (solo PATCH `/me`; coach `PlayerPositionEditor`). History integrity, cross-owner 404, unauthenticated 401, and solo-JWT-can't-reach-coach-routes (401) all confirmed. All disposable fixtures cleaned up storage-first (zero-count sweep + zero storage orphans + auth users deleted). Video was not separately re-run: the position path is media-type-independent (it lives entirely in `POST /api/sessions` + the Inngest job, never touching `media_type`), and the photo run exercised the full chain.

### migration-v16

`player_accounts.position TEXT` (nullable, free-text — mirrors `players.position`) + `sessions.position TEXT CHECK (position IN ('guard_tackle','center'))` (nullable). Both additive, safe on existing rows (all NULL). Applied + CHECK verified live.

## Pipeline Hardening (2026-07-19) — the "Build Spec — Pipeline Hardening" pass

Goal (owner's words): make the upload → analyze → feedback → display pipeline *mechanically solid* before calibration content and real users. Six items, each committed separately, each verified live before commit.

### Item 1 — production end-to-end verification + real timings

Uploaded genuinely new two-clip sessions (coach-managed and solo-player, video and photo) and confirmed with **no manual intervention** that analysis runs, measurements land, feedback auto-generates, the session page auto-refreshes, and `FeedbackCard`/`FeedbackPanel` renders. Real measured timings (server-side, `analysis/session.ready` fired → `feedback` row written, from the Inngest + Python logs):

- **Photo pair (side+front stills):** **~7 seconds.** Single-frame MediaPipe IMAGE-mode `detect()` per image — no video decode, no per-frame loop.
- **Video pair (side+front clips, single drill):** **~79 seconds.** Dominated by downloading both clips and running `detect_for_video()` across every frame of each (~2× the single-clip cost, since side and front are processed sequentially with a fresh landmarker each — see Gotcha #18).

Add to those the browser upload time (Storage PUT, scales with file size) and up to one poll interval before the UI repaints — so *user-perceived* upload→feedback-visible is roughly **10–15 s for a photo, ~85–95 s for a video**. Multi-drill sessions multiply the video figure. **This is the answer to "how long should this take": a photo is near-instant; a video is about a minute and a half.** If a video session sits past ~3–4 minutes, something is wrong (the pipeline's own timeouts are 300 s on `/analyse`, 60 s on feedback).

### Item 2 — feedback silent-failure state + retry

Before: a failed GPT-4o call left `feedback` NULL, indistinguishable from "not generated yet" — the poller spun forever and the UI showed "pending" permanently. Now there's an explicit `feedback_status` (`pending`/`processing`/`complete`/`failed`/`skipped`) + `feedback_error` on `session_videos` (migration-v15). The auto-generate path in `/analyse` sets it; `FeedbackPanel.tsx` renders a real failed state with a **Retry** button → `POST /api/sessions/[sessionId]/retry-feedback` (ownership-checked exactly like every other session route — see Gotcha #17 discipline) → Python `/regenerate-feedback` (shares core with the admin `/feedback` route). The poller (`SessionAutoRefresh.tsx`, rewritten) now stops on any terminal `feedback_status` and shows the failed state instead of spinning. Verified live by forcing a failure with a bad OpenAI key locally: row went `failed` with the error text, UI showed the retry, retry with a good key succeeded.

### Item 3 — position NULL: root-caused as a data-collection gap (finding, not a fix)

Traced upstream from `lib/jobs/ol-stance-analysis.ts`. **Finding, with evidence:** `position` (and `line_side`, `fault_type`) were being **fabricated** — the Inngest job passed hardcoded/defaulted values into `/analyse`, and `main.py`'s `/feedback` path further coerced NULL → literal defaults (the old `position → 'guard_tackle'`, already partly fixed 2026-07-17). Nothing in the upload flow or player profile ever *captures* a real position. So it's a genuine data-collection gap, not a plumbing bug. **Fix applied (the honest half):** stopped fabricating — `ol-stance-analysis.ts` now passes `data.X ?? null`, `main.py`'s `AnalyseRequest` fields are `str | None = None`, and feedback stays honestly hedged when unknown. **Not built (product decision):** where to capture position — deferred to calibration work. See Priority #6.

### Item 4 — stuck-on-loading sweep

Swept every client-side data-load with a loading state for the try/catch/finally + always-`setLoading(false)` discipline (the Gotcha #8 class that hung the plan page). Three pages were missing it — `app/[coachId]/players/page.tsx`, `.../players/[playerId]/videos/page.tsx`, `app/player/dashboard/page.tsx` — each could hang on "Loading…" forever if its fetch threw. All three now have try/catch/finally, a `loadError` state, and a retry affordance. Verified live by forcing a `window.fetch` failure: the page shows an error + retry instead of an infinite spinner.

### Item 5 — external-dependency resilience & visibility

- **OpenAI** (`service/feedback.py`): client now `OpenAI(timeout=30.0, max_retries=2)`.
- **Railway `/analyse`** (`lib/jobs/ol-stance-analysis.ts`): fetch got `AbortSignal.timeout(300_000)`; added an Inngest `onFailure` handler that writes `analysis_status='failed'` + `analysis_error` (scoped `.in('analysis_status', ['processing','ready'])` so it only touches genuinely-stuck rows) — previously a job that exhausted retries left rows stuck in `processing`/`ready` forever with no terminal signal.
- **Inngest send** (`app/api/videos/confirm/route.ts`): `inngest.send` wrapped in try/catch; the route no longer 500s if the send fails after the row is already committed — it returns an `analysis_triggered: false` flag instead of orphaning a committed row behind a failed fire.
- **Retry timeout** (`retry-feedback`): `AbortSignal.timeout(60_000)`, network error → `failed` + 502.
- **Monitoring finding/recommendation:** there is none today. Minimal cheap approach recommended (not built): the terminal `failed` states now written to `session_videos.analysis_error` / `feedback_error` are a queryable audit trail — a single scheduled query (Supabase cron or a daily Inngest cron) counting rows in a `failed` state in the last 24h, pinging a webhook/email when > 0, is enough to stop silent rot without standing up full observability. See Priority #7.

### Item 6 — front-view analysis: mechanical half only

Front rows used to reach a terminal state with `analysis` still NULL (front-view biomechanics was entirely skipped). Now the Python service extracts front landmarks and writes **raw mechanical measurements** to the front row (video and photo/IMAGE mode both): stance width (× shoulder width), knee-vs-ankle width, shoulder tilt, hip tilt, shoulder–hip tilt difference, lateral offset, down hand. **No fault judgment / thresholds / cues** — that's the calibration work, deferred, and explicitly for *both* angles together. The front payload is the raw-measurement shape (`view: 'front'`, no `summary`) so `isStructuredAnalysis()` stays false (Gotcha #8 safe); `FrontMeasurements.tsx` renders it as a plainly-labeled "Mechanical measurements only — not coaching judgment" table, distinct from the AI FeedbackCard. Reliability is conservative: video uses the `detection_rate >= 0.5` rule, a single photo is **always** `reliable: false` (same rule as the side single-frame path). Verified live: video front row `reliable: true` (detection 1.0) with real metrics, photo front row `reliable: false` with real metrics, table renders with no console errors.

### Verification note

Re-verified this pass did **not** weaken any ownership check from the security audit: unauthenticated probes on the routes this pass touched/added (`retry-feedback`, `videos/confirm`) and pre-existing hardened routes (`GET /api/players`, `GET /api/videos` with a spoofed `?coachId=`) all return **401** live; `retry-feedback`'s source enforces coach-session-matches-`coach_id`-or-403 and player-JWT-matches-`player_account_id`-or-403 (the cross-owner 403 matrix itself was exhaustively verified in the audit — Gotcha #17 — and nothing here altered those comparisons). All disposable hardening fixtures (coach `ALLB3LTGN`, its player, 3 sessions, 6 storage files, 2 consent rows, the auth user) cleaned up afterward — zero-count sweep + zero storage orphans confirmed.

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

### 18. NEW — MediaPipe VIDEO-mode `PoseLandmarker` is stateful; one instance cannot process two clips
Found while building front-view analysis (Pipeline Hardening §Item 6). A `PoseLandmarker` created in `RunningMode.VIDEO` is **stateful**: `detect_for_video()` requires monotonically-increasing timestamps *across the life of that instance* and carries pose-tracking state between calls. The original code processed the side clip then the front clip through a single module-global `_landmarker`, so the front clip's timestamps (restarting near 0) threw `"Input timestamp must be monotonically increasing"` and the front row came back null. It was also a latent cross-request bug — two sessions analyzed in a row would collide the same way. **Fix:** `/analyse` now creates a **fresh VIDEO-mode landmarker per clip** (`lm = load_model(MODEL_PATH); try: process_video_side/front(tmp, lm); finally: lm.close()`) rather than reusing one. The IMAGE-mode landmarker (`_landmarker_image`, `detect()`) is stateless and *is* safely reused. **Any new video-processing path must create its own VIDEO-mode instance — never share one across clips or requests.**

### 19. NEW — `feedback` NULL was ambiguous: "never generated" vs "failed" (fixed via `feedback_status`)
Before Pipeline Hardening §Item 2, a NULL `feedback` column meant *either* "auto-generation hasn't run yet" *or* "it ran and failed" — the poller and UI couldn't tell them apart, so a failed generation spun on "pending" forever. Now `session_videos.feedback_status` (`pending`/`processing`/`complete`/`failed`/`skipped`) + `feedback_error` disambiguate (migration-v15). **Any code that reads `feedback` to decide UI/poll state must read `feedback_status`, not `feedback == null`.** Note the CHECK constraint needed `'processing'` added after the initial apply (the retry path sets it) — the migration file already includes all five states; if re-applying from scratch it's correct, but a DB that got the first version needs the drop-and-recreate-constraint ALTER that's also in the file.

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

**Position capture — DONE 2026-07-20** (see "Solo analysis access + position capture" above). The analysis stance-position (`guard_tackle`/`center`) is captured as profile default + per-session override and reaches the feedback prompt. Still deferred (calibration work): position-specific good/bad rules/thresholds/cues. `line_side`/`fault_type` intentionally uncaptured (Step 0 finding). One owner-flag: feedback now makes position-aware claims again from the captured value — expected, grounded, still hedged on low reliability.

**`/feedback` output shape divergence from original plan** — see Next Session Priority 3.

**Fault taxonomy — understood to be two axes, not one** — see Next Session Priority 4. Positions beyond OL, *and* technique beyond stance, both need calibration rules from scratch.

**`ADMIN_SECRET` should be rotated** — exposed in a debugging screenshot during the 2026-07-17 session. Still not done.

**Resend custom domain / email delivery** — still outstanding. All transactional emails send from `onboarding@resend.dev`, which delivers only to pre-approved addresses. **This is now the blocking dependency for password reset** (built 2026-07-20) as well as minor-consent emails. When it lands, both go live simultaneously and both need re-verification with real delivery — plus the two follow-ups in "Password reset": the Redirect-URL allow-list config step, and the unverified PKCE `?code` path.

**Front-view analysis — mechanical half now built (2026-07-19), fault-judgment half still deferred.** The Python service now extracts front landmarks and writes raw mechanical measurements (stance width, shoulder/hip tilt, knee alignment, lateral offset, down hand) to the front row; `FrontMeasurements.tsx` surfaces them. What's still deferred (to calibration, for both angles together): any good-vs-bad ruleset, thresholds, or coaching cues on those measurements. See Pipeline Hardening §Item 6.

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
| `app/login/page.tsx` | **New, 2026-07-18.** Unified login — `signInWithPassword` then `GET /api/whoami` to route to `/${coachId}` or `/player/dashboard`. **Changed 2026-07-20** — added the "Forgot password?" link (one reset entry point for both roles). |
| `app/forgot-password/page.tsx` | **New, 2026-07-20.** Reset request — `resetPasswordForEmail(redirectTo: /reset-password)`. Confirmation renders unconditionally (anti-enumeration). |
| `app/reset-password/page.tsx` | **New, 2026-07-20.** Reset target — handles all three recovery-credential shapes (PKCE `?code` / `?token_hash` / implicit `#access_token`), guards no/expired token with a friendly state, `updateUser({password})` then `signOut()`, scrubs the token from the URL. |
| `lib/password.ts` | **New, 2026-07-20.** Single source of truth for the min-8 password rule (`validatePassword`/`isPasswordValid`/`PASSWORD_REQUIREMENT`), shared by both signup forms and the reset page. Server routes stay authoritative. |
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
| `service/main.py` | Python analysis service: FastAPI endpoints, MediaPipe processing, Supabase writes, sb_secret_ fix, `/feedback` route + `require_admin` dependency, auto-generates feedback inline inside `/analyse` (best-effort, try/except-wrapped, skipped on zero-detection). **Changed 2026-07-19** — loads a second `PoseLandmarker` in IMAGE mode at startup (`_landmarker_image`), `AnalyseRequest.media_type` branches `/analyse` between `process_video_side()`/`process_image_side()`, `/health` reports both landmarkers. **Changed 2026-07-19 (hardening)** — creates a **fresh VIDEO-mode landmarker per clip** for side and front (Gotcha #18) instead of reusing a global one; front-view block runs `process_video_front`/`process_image_front` + aggregate and writes the raw front analysis; auto-feedback path sets `feedback_status` (`complete`/`failed`+`feedback_error`/`skipped`); added `_regenerate_feedback_from_db()` + `/regenerate-feedback` route (service-secret-gated) backing the retry button; `AnalyseRequest.fault_type/line_side/position` now `str \| None = None` (stop fabricating — Item 3). |
| `service/feedback.py` | Builds the GPT-4o-mini prompt from raw measurements + fault_type/line_side/position, calls OpenAI, returns structured feedback. Zero-detection fallback guard. All three of fault_type/line_side/position are Optional — `None` gets an explicit "UNKNOWN, do not guess" cue rather than a silently-substituted default (the 2026-07-17 hedging fix). No `overall_grade` as of 2026-07-17 (owner decision — removed, not hidden). **Changed 2026-07-19** — `_measurements_summary()`'s `reliable` parenthetical generalized so it stays accurate for both video (detection-rate-driven) and photo (always-conservative) inputs. |
| `service/pose_utils.py` | MediaPipe pose landmark extraction, side-view slope calculation. **Changed 2026-07-19** — added `load_model_image()`/`process_image_side()`, an IMAGE-mode counterpart to `load_model()`/`process_video_side()` for Feature A (analyzed stance photos). Separate landmarker instance — MediaPipe's running mode is fixed at creation. **Changed 2026-07-19 (hardening)** — added front-view landmarks (knee/ankle/wrist), `_front_metrics()` (stance width, shoulder/hip tilt, knee-vs-ankle alignment, lateral offset, down hand), and `process_video_front()`/`process_image_front()` (Item 6). |
| `service/measurements.py` | `aggregate_side_measurements()` — filters frames, computes slope stats. **Changed 2026-07-19** — added `aggregate_single_frame_measurement()` for photos; deliberately does NOT reuse the `detection_rate >= 0.5` reliable formula, always returns `reliable: False` by design. **Changed 2026-07-19 (hardening)** — added `aggregate_front_measurements()` (video, reliable when `detection_rate >= 0.5`) and `aggregate_single_frame_front_measurement()` (photo, always `reliable: False`) for the front-view raw-measurement shape (Item 6). |
| `supabase/migration-v10-feedback-column.sql` | **New, applied.** Adds `feedback` JSONB column to `session_videos`. |
| `supabase/migration-v11-consent-retain-on-player-delete.sql` | **New, applied.** Changes `consent_records_player_id_fkey` to `ON DELETE SET NULL` and patches the `prevent_consent_update()` trigger to allow that one specific cascade update — see Gotcha #12. |
| `supabase/migration-v13-media-type.sql` | **New, applied, 2026-07-19.** Additive, `NOT NULL DEFAULT 'video'`, `media_type TEXT CHECK IN ('video','photo')` on `session_videos`. Enables Feature A. |
| `components/DeletePlayerButton.tsx` | **New.** `window.confirm()` naming the player + session count, calls `DELETE /api/players/[playerId]`. Wired into the player detail page header. |
| `components/DeleteSessionButton.tsx` | **New.** `window.confirm()` naming the session date, calls `DELETE /api/sessions/[sessionId]`. Wired into the session detail page header. |
| `app/api/videos/presign/route.ts` | Step 1 of upload: consent gate + signed URL issuance. **Changed 2026-07-19** — accepts `image/jpeg`/`image/png` (20MB cap, vs video's 500MB), and ownership hardened: `coachId` now derived from `requireCoachSession()` instead of trusted from the body, with a real 403 (not a masking 404) for a cross-owner `playerId` — see Gotcha #16. |
| `app/api/videos/confirm/route.ts` | Step 2 of upload: DB row insert + paired-clip check + Inngest fire. **Changed 2026-07-19** — same ownership hardening as `/presign`; `deriveMediaType()` sets `media_type` from the stored file's real extension, never client-supplied. **Changed 2026-07-19 (hardening)** — `inngest.send` wrapped in try/catch; no longer 500s if the fire fails after the row commits — returns an `analysis_triggered` flag instead of orphaning a committed row (Item 5). |
| `lib/openai.ts` | OpenAI client (Next.js side); `generateTrainingPlanAI()` (active); `analyzeVideoFrames()` (deprecated) |
| `lib/inngest.ts` | Inngest client, app ID `practice-field` |
| `lib/jobs/ol-stance-analysis.ts` | Inngest function: validates session, marks processing, calls Python /analyse. **Changed 2026-07-19** — `validate-session` now also reads `media_type` and rejects (`NonRetriableError`) a side/front pair with mismatched media types, a fresh-DB-read backstop behind `TwoClipUpload.tsx`'s client-side check; passes `media_type` through to `/analyse`. **Changed 2026-07-19 (hardening)** — stops fabricating `fault_type`/`line_side`/`position` (now `data.X ?? null`, Item 3); `/analyse` fetch got `AbortSignal.timeout(300_000)`; added an `onFailure` handler writing `analysis_status='failed'`+`analysis_error` scoped to still-stuck (`processing`/`ready`) rows so an exhausted-retry job reaches a terminal state (Item 5). |
| `lib/server-frames.ts` | **Deprecated 2026-07-14** — FFmpeg frame extraction for single-clip path; kept for reference |
| `components/VideoAnalysisCard.tsx` | Renders structured VideoAnalysis; raw Python measurements now show a "feedback pending" placeholder instead of a raw dump (2026-07-17). Exports `isStructuredAnalysis()` — reused by the plan page and (as of 2026-07-19) `VideoComparison.tsx`. **Changed 2026-07-19** — small 📷/🎬 badge next to the clip label reflecting `video.media_type`. **Changed 2026-07-19 (hardening)** — added a `showFeedbackState?: boolean` prop (default true); the session page passes `false` and renders feedback state via `FeedbackPanel` instead, so the two don't both draw a feedback placeholder. |
| `components/VideoComparison.tsx` | Renders the Progress Compare tab (side-by-side grade/score/issue diff between two analyzed videos). **Fixed 2026-07-19** — see Gotcha #8's "bitten four times" note: used to filter "analyzed" videos with a bare `analysis` truthiness check, then force-cast with `!`, crashing on the two-clip pipeline's raw measurement shape. Now filters with `isStructuredAnalysis()`. |
| `components/FeedbackCard.tsx` | Renders the `feedback` column (GPT-4o output) on the session results page. Returns `null` if `feedback` is null. No grade badge as of 2026-07-17. |
| `components/SessionAutoRefresh.tsx` | **Rewritten 2026-07-19 (hardening).** Client island, polls via `router.refresh()`. Props are now `status` + `feedbackInFlight`; polls while `status === 'processing'` OR feedback is genuinely in flight, and stops on any terminal `feedback_status` (`complete`/`failed`/`skipped`) — replacing the old "one grace poll then give up" hack. Renders nothing. |
| `components/FeedbackPanel.tsx` | **New, 2026-07-19 (Item 2).** Wraps `FeedbackCard`: renders it when `feedback` is present, else a `feedback_status`-driven state — a failed state with a **Retry** button (→ `POST /api/sessions/[sessionId]/retry-feedback`), a skipped note, or a pending spinner. |
| `components/FrontMeasurements.tsx` | **New, 2026-07-19 (Item 6).** Renders the front row's raw mechanical measurements as a labeled table (guarded `view === 'front'`, Gotcha #8 safe), with a low-confidence note when `reliable === false`. Explicitly NOT coaching judgment. |
| `app/api/sessions/[sessionId]/retry-feedback/route.ts` | **New, 2026-07-19 (Item 2).** Ownership-checked (coach session XOR player JWT, same discipline as Gotcha #17), sets `feedback_status='processing'`, calls the Python `/regenerate-feedback` endpoint with `X-Service-Secret` + `AbortSignal.timeout(60_000)`; records `failed`+502 on network error. |
| `supabase/migration-v15-feedback-status.sql` | **New, applied, 2026-07-19 (Item 2).** Adds `feedback_status` (`pending`/`processing`/`complete`/`failed`/`skipped`, default `pending`) + `feedback_error` to `session_videos`; backfills feedback-present rows to `complete`. See Gotcha #19 (the CHECK needed `'processing'` added post-first-apply — file has all five). |
| `service/feedback.py` (hardening) | **Also changed 2026-07-19 (Item 5)** — OpenAI client now `OpenAI(timeout=30.0, max_retries=2)`. |
| `components/VideoUpload.tsx` | **Deprecated 2026-07-14** — single-clip upload UI; no longer rendered |
| `components/TwoClipUpload.tsx` | Two-clip OL stance upload UI: presign → Storage PUT → confirm (×2). **Changed 2026-07-19** — accepts `image/jpeg`/`image/png` alongside video (20MB cap), enforces both slots being the same media type client-side (`establishedMediaType()`), 📷/🎬 icons. |
| `app/[coachId]/players/[playerId]/sessions/[sessionId]/page.tsx` | Session results page — `force-dynamic`, fetches videos, renders `VideoAnalysisCard` + `FeedbackCard` per drill, plus `SessionAutoRefresh` for live updates. **Changed 2026-07-19** — also fetches and renders `ReferencePhotosSection` scoped to this session. |
| `app/[coachId]/players/[playerId]/page.tsx` | Player detail page — stats, progress charts, latest training plan, session history. **Changed 2026-07-19** — fetches and renders `ReferencePhotosSection` scoped to this player. |
| `app/player/dashboard/page.tsx` | Self-signup player's own dashboard. **Rewired 2026-07-20 (solo analysis access)** — deprecated single-clip upload removed (dead-end gone); now a "Stance Analysis" flow (create solo session → `TwoClipUpload`) + a "My Sessions" list → results page, an editable profile-position row (`PATCH /me`), and a per-session stance-position selector defaulted from the profile. **2026-07-19** — also renders `ReferencePhotosSection` (JWT path). |
| `lib/position.ts` | **New, 2026-07-20.** Shared position logic: `FOOTBALL_POSITIONS` (broad profile taxonomy), `STANCE_POSITIONS` (`guard_tackle`/`center` + labels), `mapToStancePosition()` (profile → stance-group default: `C`→center, `OG`/`OT`→guard_tackle, else null). Bridges the two distinct position concepts (see the build's Step 0 finding). |
| `app/player/sessions/[sessionId]/page.tsx` | **New, 2026-07-20.** Solo player's own analysis results view — client mirror of the coach session page (`VideoAnalysisCard` + `FeedbackPanel` + `FrontMeasurements`), JWT-fetched, self-polling to completion. |
| `app/api/player-accounts/me/sessions/route.ts`, `.../sessions/[sessionId]/route.ts` | **New, 2026-07-20.** JWT-owned solo session list + single-session (videos with analysis/feedback + signed URLs). Cross-owner/nonexistent → 404 (the `/me` convention). |
| `app/api/player-accounts/me/route.ts` | `GET` returns account (now incl. `position`). **`PATCH` added 2026-07-20** — updates the player's own profile `position`, scoped by `auth_user_id`. |
| `components/PlayerPositionEditor.tsx` | **New, 2026-07-20.** Coach-side inline profile-position editor island on the player detail page (→ `PATCH /api/players/[id]`). |
| `app/api/sessions/route.ts` (position) | **Also changed 2026-07-20** — `POST` accepts + validates `position` (`guard_tackle`/`center`) and stores it on `sessions.position`. |
| `lib/jobs/ol-stance-analysis.ts` (position) | **Also changed 2026-07-20** — `validate-session` reads `sessions.position` (fresh DB read) and the `/analyse` body sends `clips.position` (was the always-null event payload). |
| `supabase/migration-v16-position-capture.sql` | **New, applied, 2026-07-20.** `player_accounts.position` (free-text) + `sessions.position` (CHECK `guard_tackle`/`center`). |
| `app/[coachId]/players/[playerId]/plan/page.tsx` | Virtual Training Coach plan builder. **Fixed 2026-07-17** — crashed for essentially every player reading `analysis.issues` without `isStructuredAnalysis()`; see Gotcha #8. |
| `app/[coachId]/players/[playerId]/videos/page.tsx` | Coach video library + upload tab (two-clip only as of 2026-07-14) |
| `app/api/inngest/route.ts` | Inngest serve endpoint — must be synced manually in Inngest dashboard after deploy |
| `app/api/reference-photos/presign/route.ts`, `confirm/route.ts` | **New, 2026-07-19 (Feature B).** Same direct-to-storage pattern as `/api/videos/*`, session-derived ownership from day one, reuses the coach-managed consent gate. No `view_angle`, no pairing, no `drill_type` — deliberately simpler than the analysis upload path. |
| `app/api/reference-photos/route.ts` | **New, 2026-07-19.** `GET` list — coach query-param convention (matches `GET /api/videos`) or player-account JWT self-view. |
| `app/api/reference-photos/[photoId]/route.ts` | **New, 2026-07-19.** `DELETE` — storage-first, ownership-checked (coach-managed via session, self-signup via JWT). |
| `components/ReferencePhotoUpload.tsx`, `ReferencePhotoGallery.tsx`, `ReferencePhotosSection.tsx` | **New, 2026-07-19 (Feature B).** Deliberately separate from `TwoClipUpload.tsx` — a single-control "not analyzed" upload, a labeled thumbnail gallery with click-to-enlarge, and the client-island wrapper combining both, wired into the player page, session page, and player's own dashboard. |
| `supabase/migration-v14-reference-photos.sql` | **New, applied, 2026-07-19.** `reference_photos` table — mutually-exclusive owner FK pattern (`chk_rp_has_owner`), optional `session_id`. |
| `types/index.ts` | `VideoAnalysis`, `SessionVideo` (includes `view_angle`, `media_type: 'video' \| 'photo'` as of 2026-07-19, `feedback: StanceFeedback \| null`), `AnalysisStatus`, `StanceFeedback`/`StanceFeedbackIssue` (matches `service/feedback.py`'s actual output shape — no `overall_grade` as of 2026-07-17; `OverallGrade` type still exists, used by `VideoAnalysis` only), `ReferencePhoto`. **Changed 2026-07-19 (hardening)** — `SessionVideo` gained `feedback_status: 'pending'\|'processing'\|'complete'\|'failed'\|'skipped'` and `feedback_error: string \| null` (Item 2). |
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

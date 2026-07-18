# Practice Field — Claude Code Context

> Last updated: 2026-07-18 (session that built unified role-based accounts — coaches now have real authentication for the first time, session-cookie-based auth via @supabase/ssr, role-gated pages and API routes, and removed the ~30-year-old getOrCreateCoach() auto-vivify bug)

## Next Session Priorities

1. **No coach "forgot password" flow exists yet.** Coaches now have real passwords (as of 2026-07-18) but there's no reset-password page — `getSupabaseClient().auth.resetPasswordForEmail()` needs a page to land on. Players have the same gap (pre-existing, not new). Low effort, real user-facing risk (a coach who forgets their password is currently stuck).

2. **Legacy `coaches` rows (~30) are permanently inert under the new auth model** — by explicit owner decision (2026-07-18), not migrated, not backfilled. Most are bot-crawler noise (`favicon.ico`, `contact-us`, etc. — see Gotcha #13); real coach data from before this session (if any existed) is simply unreachable now since nothing has an `auth_user_id`. Not a bug — a decision. Revisit only if it turns out real historical coach data needs recovering.

3. **`/feedback` output shape — still partially undecided.** Unchanged from before — see "What's Still Outstanding" below.

4. **Fault taxonomy expansion** — unchanged, still deferred pending calibration data. See "What's Still Outstanding" below.

5. **Run the live end-to-end verification for auto-generated feedback** — unchanged from before, still not done. See "What's Still Outstanding" below.

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

**This gotcha has now bitten twice.** Originally the guard was applied only in `VideoAnalysisCard.tsx`. On 2026-07-17 it was found that `app/[coachId]/players/[playerId]/plan/page.tsx` read `analysis.issues.sort(...)` with no guard, throwing a `TypeError` on the raw-measurement shape (which has no `issues` key). Because `load()` had no try/catch, `setLoading(false)` never ran and the page hung silently on "Loading…" forever — in production, for essentially every player, since every two-clip session produces the raw shape. Fixed by exporting `isStructuredAnalysis()` from `VideoAnalysisCard.tsx` and applying it in the plan page, plus wrapping `load()` in try/catch/finally so any future error surfaces instead of hanging silently. Verified against two players locally (session `2a740dec-572e-4d42-ad52-4713a2a793f3`'s player, and the "john" / `FG8Q7KLS2` player who originally reproduced the production hang) — both load correctly now. **Any code that reads the `analysis` field MUST apply `isStructuredAnalysis()` first** — treat this as a hard rule, not a suggestion. See the outstanding audit item below.

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

---

## What Was Fixed This Session (2026-07-18)

- **Unified role-based accounts built end-to-end** — coaches and players are now both real authenticated accounts sharing one sign-up/sign-in flow, per the "Unified accounts" architecture section above. Full detail there; summary of the pieces:
  - Cookie-based sessions (`@supabase/ssr`) replaced the old localStorage-only client, enabling server-side "who is this" checks for the first time (`lib/supabase-server.ts`, `middleware.ts` for session refresh).
  - `app/[coachId]/layout.tsx` rewritten into a real security boundary: unauthenticated → `/login`, authenticated player → `/player/dashboard`, authenticated coach hitting the wrong `coachId` → redirected to their own.
  - Role is derived, not stored — `lib/auth-role.ts`'s `resolveRole()` checks which table (`coaches` vs `player_accounts`) holds the caller's `auth_user_id`, mirroring the existing mutually-exclusive-FK pattern already used by `chk_sv_has_owner`.
  - New unified entry points: `app/signup/page.tsx` (role picker → `CoachSignupForm`/`PlayerSignupForm`), `app/login/page.tsx` (single login, auto-routes by role via `GET /api/whoami`). Old `/player/signup` and `/player/login` now just redirect to the unified pages for bookmark compatibility.
  - `POST /api/coaches/signup` — first real coach account creation (auth user + `coaches` row + consent records + verification email), mirroring the existing player-account signup pattern.
- **`getOrCreateCoach()` auto-vivify bug removed** — see Gotcha #13. This was the root cause of ~30 garbage `coaches` rows (bot-crawler noise), discovered live during Step 0 investigation. `app/[coachId]/page.tsx` now just reads the coach row the layout has already verified belongs to the caller.
- **`POST /api/coach` (the other anonymous coach-creation path — "your Coach ID is your password") removed entirely** — superseded by `POST /api/coaches/signup`. Left in place would have repeated the exact "old insecure path beside new one" mistake explicitly flagged for `getOrCreateCoach()`.
- **API-route ownership checks strengthened across the board, closing real vulnerabilities found during this build:**
  - `POST /api/players` previously trusted `body.coach_id` from the client with **zero verification** — a coach could create a player under any other coach's account just by changing a request body field. Now derives `coachId` from the verified session via `requireCoachSession()`.
  - `PATCH /api/players/[playerId]` and `PATCH /api/sessions/[sessionId]` previously had **no ownership check at all** (a gap already documented as outstanding from the 2026-07-17 audit item). Both now verify the caller owns the row before allowing the update.
  - `DELETE /api/players/[playerId]` and `DELETE /api/sessions/[sessionId]` (already ownership-checked as of 2026-07-17) switched from a client-supplied `coachId` query param to the session-derived value — closes the theoretical gap of a client omitting/spoofing that param.
  - `PATCH /api/coach` switched from trusting `body.coachId` to session-derived `coachId`.
  - `GET /api/coach` intentionally left as-is (read-only, already indirectly protected by the outer layout gate) — explicit scope boundary, not an oversight.
- **Coach sign-out added** — coaches previously had no way to sign out (there was no session to sign out of). New logout button in `components/Navigation.tsx`, calls `auth.signOut()` then redirects to `/login`. Discovered as a gap during live verification, judged in-scope as basic auth-foundation work.
- **New migration applied:** `supabase/migration-v12-coaches-auth-user-id.sql` — additive, nullable, unique `coaches.auth_user_id UUID REFERENCES auth.users(id)`. Tested on a disposable row (FK + uniqueness behavior) before applying, per the same discipline used for migration-v11. Committed separately from the app-wiring changes.
- **Local `.env.local` anon key fixed** — see Gotcha #14. Pure local dev-environment fix (gitignored, not committed), unrelated to any app code, discovered because it broke live login testing.
- **Verified live** (real signups, real logins, real DB, real Storage — not just typechecked), per the build spec's explicit requirement: coach signup → coach dashboard → add player, works end-to-end; player signup → fully functional solo with no coach, works end-to-end; role-gating enforced both at the page level (redirects) and the API level (401/403) in both directions; cross-coach 403s still hold after the account changes (re-verified, not assumed); no orphaned data; all disposable test fixtures (2 `auth.users`, 1 `coaches`, 1 `players`, 1 `player_accounts`, 4 `consent_records`) cleaned up afterward and confirmed gone via a zero-count sweep query, without touching an unrelated pre-existing "Test Player" row under a different coach.
- **Out of scope, deliberately not built this session** (per explicit owner instruction): subscriptions/billing/tiers, player↔coach invite/linking system, Google sign-in. A player being fully functional solo is required and works; "coach links to an existing player" is a later layer.

---

## What's Still Outstanding

**No coach password-reset flow** — see Next Session Priority 1. Coaches have real passwords now with no way to recover a forgotten one; players have the same pre-existing gap.

**AUDIT: find any other unguarded `analysis` reads** — Gotcha #8 has now caused a real production hang twice (`VideoAnalysisCard`, then the plan page). Both known spots are fixed, but if two places missed the `isStructuredAnalysis()` guard, a third may exist. Do a repo-wide search for every place the `analysis` field is read/dereferenced and confirm each applies the guard before touching shape-specific fields like `.issues`, `.summary`, `.scores`, `.plan`. Low effort, high value — prevents the next silent hang.

**Legacy `coaches` rows (~30) are permanently inert** — see Next Session Priority 2. Explicit owner decision as of 2026-07-18, not a bug. Mostly bot-crawler noise from the `getOrCreateCoach()` auto-vivify bug (Gotcha #13); left as-is, not migrated.

**Identity linking/merging (player↔coach)** — deliberately not built this session, per explicit scope boundary. "Coach links to an existing player account" is a real future need but was pinned pending subscription decisions; a coachless player must remain (and does remain) fully functional on its own.

**Subscriptions/billing/player limits** — explicitly out of scope for the accounts work; no design started.

**Google sign-in** — still just scoped/designed conceptually (from earlier in this broader session), not built. Should stay compatible with the new unified accounts model when it is eventually built — same derived-role approach should extend cleanly since it keys off `auth_user_id`, not a stored role string.

**Live end-to-end verification of auto-generated feedback** — see Next Session Priority 5 / "What Was Fixed" 2026-07-17. Implemented and logic-verified; not yet proven against a real upload through the deployed app.

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
| `app/api/coach/route.ts` | `POST` **removed 2026-07-18** — the old anonymous "Coach ID is your password" creation path, superseded by `POST /api/coaches/signup` (see Gotcha #13's sibling fix). `PATCH` now derives `coachId` from `requireCoachSession()` instead of trusting `body.coachId`. `GET` unchanged (read-only, indirectly protected by the layout gate). |
| `app/[coachId]/page.tsx` | **Changed 2026-07-18** — `getOrCreateCoach()` removed entirely (see Gotcha #13); now a direct, defensive `.select()` since the layout already guarantees this `coachId` belongs to the authenticated coach. |
| `app/player/signup/page.tsx`, `app/player/login/page.tsx` | **Changed 2026-07-18** — now trivial redirects to `/signup`/`/login`, kept only for bookmark compatibility. |
| `app/page.tsx` | **Changed 2026-07-18** — landing page; removed the old anonymous "Start Coaching" flow and coach-ID resume input, now links to `/signup`/`/login`. |
| `app/api/players/route.ts` | **Changed 2026-07-18** — `POST` previously trusted `body.coach_id` from the client with zero verification (real vulnerability, found this session); now derives `coachId` via `requireCoachSession()`. `GET` similarly switched from a `coachId` query param to session-derived. |
| `app/api/players/[playerId]/route.ts` | GET/PATCH/**DELETE**. `DELETE` rewritten 2026-07-17 — see Gotcha #11. **`PATCH` gained an ownership check 2026-07-18** (previously had none — closed the outstanding audit item from 2026-07-17). `DELETE` switched from query-param to session-derived `coachId`. |
| `app/api/sessions/[sessionId]/route.ts` | GET/PATCH/**DELETE**. Same treatment as the player route — `PATCH` gained an ownership check 2026-07-18, `DELETE` switched to session-derived `coachId`. |
| `components/Navigation.tsx` | **Changed 2026-07-18** — added a "Log out" button (coaches previously had no session to sign out of). |
| `components/DeletePlayerButton.tsx`, `components/DeleteSessionButton.tsx` | **Changed 2026-07-18** — dropped the `?coachId=...` query param from their `fetch()` calls; the strengthened routes derive it from the session cookie instead. |
| `supabase/migration-v12-coaches-auth-user-id.sql` | **New, applied, 2026-07-18.** Additive, nullable, unique `coaches.auth_user_id UUID REFERENCES auth.users(id)`. |
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

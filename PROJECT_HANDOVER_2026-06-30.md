# Practice Field — Technical Handover Document
**Date:** 2026-06-30  
**Supabase project:** `kzyxheyobuoqtwmdjwau`  
**All claims in this document verified against actual files, live DB, or git history — not reconstructed from memory.**

---

## 1. PROJECT OVERVIEW

### What Practice Field is

Practice Field is a football coaching and video analysis web app. The primary users are coaches (who manage player rosters, log sessions, and upload practice video) and self-signup players (who can create their own accounts and submit video for analysis). The stack is Next.js 14 (App Router, TypeScript), Supabase (Postgres + Storage + Auth), and Resend for transactional email.

### Architecture principle — pose-tracking + geometry, language model for phrasing only

The measurement pipeline is built on this rule:

> **MediaPipe BlazePose (pose_landmarker_heavy.task, 33-point) extracts landmark coordinates. Project-written geometry code computes the metric (angle, ratio, deviation). A calibrated numeric range defines "good" vs "bad". A language model is only used to phrase the finding for the coach — it never makes a visual judgment.**

This is enforced by the calibration pipeline: good-stance and bad-stance clips are run through the same measurement scripts. The output CSVs define the calibrated range. The AI sees the number, not the video.

### The 3-question rule for new measurements

Before building any new measurement, ask:
1. Can this be computed from BlazePose landmarks alone, or does it require external data (scale, camera calibration)?
2. What is the anatomically correct reference axis? (e.g., hips not shoulders for width ratio, because shoulder pads distort apparent shoulder width)
3. Is the camera angle a confound? (side-view and front-view cannot be mixed — they are treated as separate measurements requiring separate calibration runs)

---

## 2. FILE INVENTORY

### 2a. Calibration / measurement scripts (`scripts/`)

All scripts use MediaPipe Tasks API 0.10.x with `pose_landmarker_heavy.task`. The model file lives at `scripts/pose_landmarker_heavy.task` (not committed; large binary).

---

#### `scripts/back_slope_angle.py` — M1 back-slope from VIDEO
**Purpose:** Extracts per-frame back-slope angle (signed degrees) from a single source video using VIDEO running mode (temporal smoothing).  
**Reads:** Hardcoded `SOURCE_VIDEO` path at top of file (must be updated per batch).  
**Writes:** `scripts/back_slope_angles.csv` (columns: `frame, time_s, person, angle_deg, note, drill, quality, view`).  
**Privacy:** Source video is deleted after a successful run (success/finally pattern). `assert_clean_columns()` runs before deletion; if the output CSV contains any forbidden column name, the run aborts without deleting the source.  
**CLI:**
```
py scripts/back_slope_angle.py --drill <snake_case> --quality good|bad --view side|front
```
All three flags are required (`argparse`, no defaults).

---

#### `scripts/m1_measure_stills.py` — M1 back-slope from STILLS
**Purpose:** Batch measures back-slope across a list of PNG stills using IMAGE running mode (no temporal smoothing; for static stance measurement).  
**Reads:** Hardcoded `STILLS` list at top of file (filenames relative to `SCRIPTS` dir).  
**Writes:** `scripts/m1_results_good.csv` (columns: `person, slope_deg, lean_from_vertical, higher, note, drill, quality, view`).  
**Privacy:** All source stills are deleted after a successful run. Same assert_clean_columns guard.  
**CLI:**
```
py scripts/m1_measure_stills.py --drill <snake_case> --quality good|bad --view side|front
```
All three flags required.

---

#### `scripts/validate_clean_csv.py` — dual validation gate for `*_clean.csv` files
**Purpose:** Runs two independent checks on any manually-curated `*_clean.csv` before it enters the calibration dataset.  
**Check 1 — Identity-leak guard (`assert_clean_columns`):** Fails if any column name matches the forbidden exact/suffix/prefix sets (e.g. `file`, `filename`, `_path`, `date_`). Prevents source footage traceability.  
**Check 2 — Structure guard (`assert_required_structure`):** Fails if `drill`, `quality`, or `view` columns are missing, or if `quality` values are not exactly `good`/`bad` or `view` values are not exactly `side`/`front`. **Case-sensitive — `Good` would be caught as invalid.**  
**CLI:**
```
py scripts/validate_clean_csv.py scripts/m1_results_good_clean.csv [more files...]
```
Exits 1 if any file fails either check; reports all failures before exiting.

---

#### `scripts/foot_width_preview.py` — front-view foot-width overlay (preview only)
**Purpose:** Visual sanity-check: draws hip-width line, ankle-width line, and computes foot-width/hip-width ratio for a single front-view still. Does NOT write to any calibration CSV, does NOT delete the source image.  
**Reads:** Single image path (positional arg).  
**Writes:** `scripts/foot_width_preview_overlay.jpg` (gitignored).  
**Measurement note:** Hip width is the correct denominator (not shoulder width) because shoulder pads distort apparent shoulder position.  
**CLI:**
```
py scripts/foot_width_preview.py <image_path> --drill <snake_case> --quality good|bad --view side|front
```
All three flags required.

---

#### `scripts/full_pose_preview.py` — all-landmarks diagnostic overlay (preview only)
**Purpose:** Draws all 33 BlazePose landmarks, full skeleton, and joint angles (back slope, L/R shoulder, elbow, hip, knee, ankle, foot/hip width ratio) on a single still. Confidence-coded dots (red ≥ 0.5, orange 0.2–0.5, grey < 0.2). Proportional scaling for high-res phone photos.  
**Reads:** Single image path (positional arg).  
**Writes:** `scripts/full_pose_preview_overlay.jpg` (gitignored).  
**Not part of the validated pipeline:** No CSV write, no source deletion, no argparse flags for drill/quality/view.  
**CLI:**
```
py scripts/full_pose_preview.py <image_path>
```

---

#### Utility / diagnostic scripts (not part of the validated pipeline)

| Script | Purpose |
|---|---|
| `scripts/mediapipe_pose.py` | 33-point skeleton overlay on video — detection only, no angle computation. VIDEO mode with temporal smoothing. |
| `scripts/back_slope_overlay.py` | Per-frame skeleton + shoulder→hip line + signed back-slope angle burned into a video output. Visual companion to `back_slope_angle.py`. |
| `scripts/check_stills.py` | Draws skeleton on the three 0606 stills; colour-codes detected persons; draws the shoulder→hip M1 measurement line. Used to confirm person-index stability across frames. |
| `scripts/check_9s_default.py` | Re-runs MediaPipe on `0606_rep1_9s.png` at default confidence (0.5). Saves overlay and prints M1 measurements. |
| `scripts/check_9s_lowconf.py` | Same as above but at `min_detection_confidence=0.3`. Used to investigate low-confidence detections. |

These scripts have **hardcoded absolute paths** (e.g. `C:\Users\abyno\...`) and are not portable without editing. They are investigative tools, not pipeline steps.

---

### 2b. Migration files (`supabase/`)

Listed in application order. **See Section 3 for which have actually been applied to the live DB.**

| File | What it does |
|---|---|
| `supabase/migrations.sql` | v1 schema: `coaches`, `players`, `sessions`, `training_plans`, `progress_metrics`, RLS policies. |
| `supabase/video-migration.sql` | `session_videos` table, `session-videos` Storage bucket. Original `player_id` + `coach_id` NOT NULL (later relaxed by v5). |
| `supabase/migration-v3-drills-feedback.sql` | `drills`, `videos` (instructional, not player footage), `feedback_notes` tables. `drill-library` Storage bucket. **NEVER APPLIED — see Section 3.** |
| `supabase/migration-v4-consent.sql` | `consent_records` (append-only, guarded by delete/update triggers), consent columns on `players` (`date_of_birth`, `is_minor`, `consent_status`, `parental_consent_status`, `training_opt_in`), `is_minor` compute trigger on players. |
| `supabase/migration-v5-player-accounts.sql` | `player_accounts` table (self-signup, Supabase Auth–linked), `player_account_id` FK added to `consent_records` and `session_videos`, `player_id`/`coach_id` made nullable in `session_videos`, `chk_sv_has_owner` constraint, `linked_player_account_id` on players. |
| `supabase/migration-v6-coach-managed-consent.sql` | Adds `parent_email`, `parent_consent_token`, `parent_consent_token_expires_at`, `parent_consent_requested_at`, `parent_consent_confirmed_at` to `players`. Enables the `/consent/[token]` email flow for coach-managed minors. |
| `supabase/migration-v7-two-clip-sessions.sql` | `recorded_at` (no-op capture of dashboard-added column), `view_angle` column + inline CHECK on `session_videos`, `chk_sv_analysis_status` CHECK constraint (8 values), partial index `idx_sv_session_view`. |

---

### 2c. Key app routes

| Route | Method | What it does |
|---|---|---|
| `app/api/videos/upload/route.ts` | POST | Accepts multipart: `file`, ownership fields, `session_id`, `view_angle` (required, 'side'/'front'), `label`, `drill_type`, etc. Runs consent gate (fresh DB read, never trusts client) before any storage/DB op. Sets `analysis_status` based on session_id and view_angle pairing logic. Promotes both clips to `'ready'` when the paired clip is found. |
| `app/api/videos/analyze/route.ts` | POST | Triggers AI analysis on a single video (server downloads from storage, extracts frames). Not called by TwoClipUpload — analysis triggering is a separate step. |
| `app/api/sessions/route.ts` | GET, POST | GET lists sessions by coachId/playerId. POST creates a new session row (`player_id` + `coach_id` + `session_date` required). Returns `{ session: { id, ... } }`. |
| `app/api/players/route.ts` | GET, POST | POST creates player with full token-based parental consent flow for minors: generates token, writes to DB, sends email via Resend. |
| `app/api/players/[playerId]/route.ts` | GET, PATCH, DELETE | PATCH with `grant_parental_consent: true` immediately sets `parental_consent_status: 'obtained'` WITHOUT sending a token — this is the **old checkbox-assertion backdoor** (see Section 7). |
| `app/api/consent/[token]/route.ts` | GET, POST | GET validates token against both `players` and `player_accounts`. POST handles parent confirm/decline, nulls the token (single-use), updates status, writes consent_records with IP + user-agent. |
| `app/api/player-accounts/route.ts` | POST | Self-signup player creation. |
| `app/api/player-accounts/me/route.ts` | GET | Returns account for authenticated player (JWT required). |
| `app/api/player-accounts/me/videos/route.ts` | GET | Lists videos for authenticated player. |

---

## 3. LIVE DATABASE STATE

**Verified project:** `kzyxheyobuoqtwmdjwau` (confirmed by `.env.local` and by querying `pg_tables`).

### Tables present in live DB (queried 2026-06-30)

```
coaches, consent_records, player_accounts, players,
progress_metrics, session_videos, sessions, training_plans
```

**`drills`, `videos`, `feedback_notes` are NOT present.** Migration-v3 has never been applied.

---

### `session_videos` — full column layout (live DB)

| column_name | data_type | nullable | default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| session_id | uuid | YES | — |
| player_id | uuid | YES | — |
| coach_id | text | YES | — |
| storage_path | text | NO | — |
| public_url | text | YES | — |
| file_name | text | YES | — |
| file_size_bytes | bigint | YES | — |
| duration_seconds | double precision | YES | — |
| thumbnail_path | text | YES | — |
| analysis_status | text | YES | 'pending'::text |
| analysis | jsonb | YES | — |
| frame_paths | ARRAY | YES | — |
| label | text | YES | — |
| drill_type | text | YES | — |
| notes | text | YES | — |
| is_baseline | boolean | YES | false |
| created_at | timestamptz | YES | now() |
| **recorded_at** | **date** | **YES** | **CURRENT_DATE** |
| player_account_id | uuid | YES | — |
| **view_angle** | **text** | **YES** | **—** |

`session_id` carries a FK: `FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE`. A random client-generated UUID passed as `session_id` **will fail at insert**. The calling page must create a real sessions row first.

---

### `players` — full column layout (live DB)

| column_name | data_type | nullable | default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| coach_id | text | NO | — |
| name | text | NO | — |
| position | text | YES | — |
| experience_level | text | YES | 'beginner' |
| created_at | timestamptz | YES | now() |
| date_of_birth | date | YES | — |
| is_minor | boolean | YES | — |
| consent_status | text | NO | 'pending' |
| parental_consent_status | text | NO | 'not_required' |
| training_opt_in | boolean | NO | false |
| linked_player_account_id | uuid | YES | — |
| parent_email | text | YES | — |
| parent_consent_token | text | YES | — |
| parent_consent_token_expires_at | timestamptz | YES | — |
| parent_consent_requested_at | timestamptz | YES | — |
| parent_consent_confirmed_at | timestamptz | YES | — |

---

### `player_accounts` — full column layout (live DB)

| column_name | data_type | nullable | default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| auth_user_id | uuid | NO | — |
| email | text | NO | — |
| display_name | text | NO | — |
| date_of_birth | date | NO | — |
| is_minor | boolean | NO | — |
| training_opt_in_requires_parent | boolean | NO | — |
| account_status | text | NO | — |
| parent_email | text | YES | — |
| parent_consent_status | text | NO | — |
| parent_consent_token | text | YES | — |
| parent_consent_token_expires_at | timestamptz | YES | — |
| parent_consent_requested_at | timestamptz | YES | — |
| parent_consent_confirmed_at | timestamptz | YES | — |
| training_opt_in | boolean | NO | false |
| terms_version | text | NO | — |
| terms_accepted_at | timestamptz | NO | — |
| needs_admin_review | boolean | NO | false |
| created_at | timestamptz | NO | now() |

---

### `consent_records` — full column layout (live DB)

| column_name | data_type | nullable | default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| coach_id | text | YES | — |
| player_id | uuid | YES | — |
| consent_type | text | NO | — |
| document_version | text | NO | — |
| accepted | boolean | NO | — |
| accepted_by_email | text | YES | — |
| ip_address | text | YES | — |
| user_agent | text | YES | — |
| created_at | timestamptz | NO | now() |
| player_account_id | uuid | YES | — |

Table is **append-only**: DB triggers `trg_consent_no_delete` and `trg_consent_no_update` fire even for the service role, making deletions and updates impossible from any path.

---

### CHECK constraints (live DB — all four central tables)

| table | constraint | definition |
|---|---|---|
| consent_records | chk_consent_has_subject | coach_id IS NOT NULL OR player_account_id IS NOT NULL |
| consent_records | consent_type_check | consent_type IN ('terms_of_service','privacy_policy','player_consent','parental_consent','training_opt_in') |
| player_accounts | chk_pa_account_status | account_status IN ('pending_minor_consent','active','restricted') |
| player_accounts | chk_pa_adult_not_pending | is_minor OR account_status != 'pending_minor_consent' |
| player_accounts | chk_pa_adult_parent_consent_irrelevant | is_minor OR parent_consent_status = 'not_required' |
| player_accounts | chk_pa_minor_needs_parent_email | NOT is_minor OR parent_email IS NOT NULL |
| player_accounts | chk_pa_parent_consent_status | parent_consent_status IN ('not_required','pending','obtained','declined') |
| player_accounts | chk_pa_token_has_expiry | parent_consent_token IS NULL OR parent_consent_token_expires_at IS NOT NULL |
| players | chk_consent_status | consent_status IN ('pending','obtained','refused','withdrawn') |
| players | chk_parental_consent_status | parental_consent_status IN ('not_required','pending','obtained','refused','withdrawn') |
| session_videos | chk_sv_analysis_status | analysis_status IN ('pending','processing','failed','complete','awaiting_both','awaiting_side','awaiting_front','ready') |
| session_videos | chk_sv_has_owner | (player_id + coach_id set AND player_account_id NULL) OR (player_account_id set AND player_id + coach_id NULL) |
| session_videos | session_videos_view_angle_check | view_angle IN ('side','front') |

---

### Migration file vs live DB — applied/not applied

| Migration file | Applied to live DB? | Evidence |
|---|---|---|
| `supabase/migrations.sql` | **YES** | coaches, players, sessions, training_plans, progress_metrics tables present |
| `supabase/video-migration.sql` | **YES** | session_videos table present |
| `supabase/migration-v3-drills-feedback.sql` | **NO** | drills, videos, feedback_notes tables absent from live DB |
| `supabase/migration-v4-consent.sql` | **YES** | consent_records table present; consent columns on players present |
| `supabase/migration-v5-player-accounts.sql` | **YES** | player_accounts table present; chk_sv_has_owner constraint present |
| `supabase/migration-v6-coach-managed-consent.sql` | **YES** | parent_consent_token et al. present on players table |
| `supabase/migration-v7-two-clip-sessions.sql` | **YES** | recorded_at, view_angle, chk_sv_analysis_status, idx_sv_session_view all confirmed in live DB |

**Migration-v3 is a gap:** the file exists on disk (untracked, never committed), describes tables that don't exist in the live DB, and those tables are referenced nowhere in the current app routes. The migration-v7 comment block explicitly notes that v7 has no dependencies on drills/videos/feedback_notes — this was verified before applying.

---

## 4. CALIBRATION DATA STATE

### `scripts/m1_results_good_clean.csv` — the validated calibration dataset

Read directly from disk:

```
person,slope_deg,lean_from_vertical,higher,note,drill,quality,view
0,174.86,95.14,hips,ok,ol_stance_3point,good,side
0,-147.74,57.74,shoulders,ok,ol_stance_3point,good,side
1,167.45,102.55,hips,ok,ol_stance_3point,good,side
```

**3 rows. All `drill=ol_stance_3point`, `quality=good`, `view=side`.**

This file has passed both `assert_clean_columns()` and `assert_required_structure()` validation.

---

### Other CSV files on disk

**`scripts/m1_results_good.csv`** — raw output (pre-clean, never committed):
```
person,slope_deg,lean_from_vertical,higher,note
0,-151.79,61.79,shoulders,ok
1,-100.2,10.2,shoulders,ok
0,174.86,95.14,hips,ok
0,-147.74,57.74,shoulders,ok
1,167.45,102.55,hips,ok
```
5 rows. **Old column structure — no drill/quality/view columns.** This was produced before the CSV structure migration. Not committed. The clean rows from this file are what appear in `m1_results_good_clean.csv` (with drill/quality/view added manually).

**`scripts/back_slope_angles.csv`** — untracked, not committed. 10 rows, all `no_detection`. Column structure: `frame, time_s, person, angle_deg, note` — the **old structure without drill/quality/view**. This was produced by a pre-argparse run of `back_slope_angle.py` before the column structure migration in commit dc9c512. It is stale and should not be used.

---

### What calibration data exists vs does not exist

| Measurement | Quality | View | Data exists? |
|---|---|---|---|
| M1 back-slope | good | side | YES — 3 rows in `m1_results_good_clean.csv` |
| M1 back-slope | bad | side | **NO** — no bad-stance side-view data has been run through the pipeline |
| M1 back-slope | good | front | **NO** |
| M1 back-slope | bad | front | **NO** |
| Foot-width / hip-width ratio | any | front | **NO** — `foot_width_preview.py` is a visual preview tool only; no calibration CSV exists for this measurement |

**The calibrated range for M1 back-slope cannot be computed yet.** A calibrated range requires both good-stance and bad-stance data. Only good-stance side-view exists. The measurement pipeline is built and validated; the data collection is incomplete.

---

## 5. CONSENT / PRIVACY ARCHITECTURE STATE

### Coach-managed parental consent — current state

**What was built:**
- v6 migration: adds `parent_consent_token`, `parent_consent_token_expires_at`, `parent_consent_requested_at`, `parent_consent_confirmed_at` to `players` table. Applied to live DB. ✓
- `POST /api/players`: generates a 64-char hex token via `crypto.randomBytes(32)`, stores it with 30-day expiry, sends consent email via Resend with `/consent/<token>` link, sets `parental_consent_status: 'pending'`. ✓
- `GET /api/consent/[token]`: validates token against both `players` and `player_accounts`, checks expiry, returns player name. ✓
- `POST /api/consent/[token]`: parent confirms or declines; nulls the token (single-use); updates `parental_consent_status`; writes consent_records with IP + user-agent. ✓

**The unresolved gap — PATCH backdoor still active:**
`PATCH /api/players/[playerId]` with `{ grant_parental_consent: true, parental_email, coach_id }` immediately sets `parental_consent_status: 'obtained'` in the DB and writes a consent_record with `accepted: true` — **no token, no email sent, no parent action required.** This is the old checkbox-assertion pattern that v6 was intended to replace. The route was not updated as part of commit `eb2b75a`.

**The videos page consent gate uses the old backdoor:**
`app/[coachId]/players/[playerId]/videos/page.tsx` (current on-disk version) contains `grantParentalConsent()` which calls `PATCH /api/players/${playerId}` with `grant_parental_consent: true`. The UI shows an email input and a "I confirm..." checkbox. This grants consent server-side instantly without any parent interaction. **This page was not updated when the token flow was built.**

**What has not been tested end-to-end with a real run:**
The full `POST /api/players` → Resend email → parent opens `/consent/[token]` → `POST /api/consent/[token]` flow has been code-reviewed and the routes are correctly wired, but no confirmation exists that a real email has been delivered and a real parent has clicked through in a live environment. The `RESEND_API_KEY` and `NEXT_PUBLIC_APP_URL` env vars must be set for the email step to work.

---

### Two-clip session model — what is live vs pending

**Live in DB (verified):**
- `session_videos.view_angle` column (nullable text, CHECK `'side'/'front'`) ✓
- `session_videos.recorded_at` column (date, DEFAULT CURRENT_DATE) ✓
- `chk_sv_analysis_status` CHECK constraint (8 values) ✓
- `idx_sv_session_view` partial index ✓

**Live in upload route (`app/api/videos/upload/route.ts`):**
- `view_angle` validation (required, 400 if missing or invalid) ✓
- `initialStatus` logic (awaiting_front / awaiting_side / awaiting_both) ✓
- Paired-clip check: queries for paired clip, updates both to `'ready'`, returns `session_ready: true` ✓

**Built but not committed:**
- `components/TwoClipUpload.tsx` — new component (untracked, not saved to git)
- `types/index.ts` — `AnalysisStatus` type expanded to include two-clip values (unstaged change, not committed)

**Drafted but never saved to disk:**
- Updated `app/[coachId]/players/[playerId]/videos/page.tsx` — the version with the mode toggle, `createOlSession`, and `TwoClipUpload` wiring was shown to the user for review but was NOT written to disk. The file on disk is the original (single-clip only, old consent gate). The save was blocked pending a decision on the consent gate.

---

## 6. GIT STATE

### Recent commits (`git log --oneline -20`)

```
21fef9e feat: two-clip session model — view_angle column, analysis_status CHECK constraint, paired-clip promotion logic, recorded_at schema capture
dc9c512 feat: calibration CSV structure — drill/quality/view columns, validate_clean_csv guards, foot and full pose preview scripts
81d8dde Add privacy-enforcing calibration pipeline for M1 back-slope dataset
eb2b75a Replace coach parental-consent checkbox with email token flow
96f36bb Block minor signup when player and parent email match
05ab92e Add player signup and login entry points to home page
844becf Fix integer < interval type error in is_minor trigger functions
8942574 Add player login, dashboard, and me/videos API routes
8131433 Add player_account_id branch to video upload route
a289648 Fix generateLink missing password field for signup type
5b7487a Add player signup page and parental consent flow
7fc65fc Add Player Accounts: migration v5, signup API, admin visibility route
dbe32a8 Add consent tracking: ToS/Privacy gate, player consent, upload block
c4b9f8d Expand CB, FS, SS, NB drill libraries from DB Drill Manual source
0a71f8a Split DB into dedicated CB, SS, FS libraries; add NB screen recognition drill
ae6eaf9 Add 3 new NB drills from GripBoost secondary training resource
d2c2483 Fix OLB routing: use dedicated edge-defender library instead of generic LB pool
7b38b4c Add Holder (H), Punt Returner (PR), and Kick Returner (KR) specialist positions
5cd9044 Add Nickelback (NB) and MLB position support across the full pipeline
a8a22af Give FB its own blocker-first drill library; update OL/FB video analysis cues
```

Branch is **4 commits ahead of `origin/main`** (not pushed).

### Current `git status`

```
modified (unstaged):
  types/index.ts               ← AnalysisStatus expanded with two-clip values

untracked:
  components/TwoClipUpload.tsx ← new two-clip upload component (built, not committed)
  public/PracticeField Logo.jpg
  scripts/back_slope_angles.csv ← stale pre-argparse CSV, should NOT be committed
  supabase/migration-v3-drills-feedback.sql ← never applied, decision needed
```

### Discrepancies between "done" and git history

1. **migration-v7 is committed (`21fef9e`) and applied to live DB.** Consistent. ✓
2. **`app/api/videos/upload/route.ts`** was modified for two-clip support and committed in `21fef9e`. Consistent with live DB state. ✓
3. **`components/TwoClipUpload.tsx`** was built in this session but is **untracked** — not in `21fef9e`. The commit message says "paired-clip promotion logic" which refers to the upload route, not the UI component.
4. **`types/index.ts`** change is unstaged — not in any commit yet.
5. **`app/[coachId]/players/[playerId]/videos/page.tsx`** — the proposed update adding `TwoClipUpload` was drafted and shown for review but **never written to disk**. The on-disk file is unchanged from before this session's work on the UI.

---

## 7. OPEN GAPS AND KNOWN ISSUES

### 7a. Critical / blocking

**GAP 1 — PATCH backdoor bypasses parent consent (HIGH)**  
`PATCH /api/players/[playerId]` with `grant_parental_consent: true` still allows a coach to assert parental consent without any parent action. The videos page consent gate (`app/[coachId]/players/[playerId]/videos/page.tsx`) calls this endpoint. This is the gap that `eb2b75a` was supposed to close for coach-managed players, but the PATCH handler was not updated and the videos page UI was not updated. Two things need to happen:
- Remove or gate the `grant_parental_consent` path from the PATCH handler, replacing it with a "resend consent email" flow.
- Update the videos page consent block to show the pending-token state and a "Resend consent email" button instead of the checkbox-assertion UI.

**GAP 2 — TwoClipUpload not wired into any page (BLOCKING for the OL stance submission flow)**  
`components/TwoClipUpload.tsx` is built and passes TypeScript checks but is untracked and not wired into any page. The videos page update that wires it in was drafted but never saved. The save was blocked pending a decision on the consent gate (gap 1 above).

**GAP 3 — types/index.ts change not committed**  
`AnalysisStatus` type includes the two-clip values in the working copy but is unstaged. Any fresh `git checkout` or CI run that resets the working tree would revert this, causing type errors in `TwoClipUpload.tsx` and anywhere that status values are checked.

### 7b. Structural limitations

**GAP 4 — TwoClipUpload unavailable for self-signup players**  
`POST /api/sessions` requires `player_id` + `coach_id`. Self-signup players (`player_account_id`) cannot create a sessions row via this route. `TwoClipUpload` receives a `sessionId` prop that must reference a real `sessions` row (FK confirmed in live DB). Until either: (a) sessions table gains a `player_account_id` path, or (b) a lightweight session-pairing concept is built that doesn't require a `sessions` row, `TwoClipUpload` is coach-managed only. `app/player/dashboard/page.tsx` still uses the old single-clip upload pattern and **must not be changed** until this is resolved.

**GAP 5 — migration-v3 decision pending**  
`supabase/migration-v3-drills-feedback.sql` creates `drills`, `videos`, and `feedback_notes` tables. The file exists on disk (untracked) but has never been applied. No app routes reference these tables. No decision has been made on whether to apply it, delete it, or defer it. It should not be committed until that decision is made.

### 7c. Calibration pipeline gaps

**GAP 6 — No bad-stance data in calibration dataset**  
`m1_results_good_clean.csv` has 3 rows, all `quality=good`, `view=side`. There is no bad-stance side-view data, no front-view data of any quality, and no foot-width/hip-width calibration data. A calibrated numeric range (the core of the measurement architecture) cannot be computed until both good and bad data exist for each view.

**GAP 7 — `back_slope_angles.csv` is stale**  
The untracked `scripts/back_slope_angles.csv` has 10 rows all `no_detection` and uses the old column structure (no drill/quality/view). It predates the argparse migration in dc9c512. It should not be committed. If a valid video run is attempted, the old file would be overwritten by `back_slope_angle.py`.

**GAP 8 — `m1_results_good.csv` has old column structure**  
The raw (non-clean) output file on disk still uses the pre-dc9c512 column structure (`person, slope_deg, lean_from_vertical, higher, note` — no drill/quality/view). Future runs of `m1_measure_stills.py` will write the new structure and overwrite this file. It is not committed; this is not a correctness problem, just a state note.

**GAP 9 — Multi-person stable labeling deferred**  
In multi-person clips, MediaPipe's `person=0` in one still may not be the same physical player as `person=0` in another still. Person-index instability is a known limitation. No solution is implemented. Current `m1_results_good_clean.csv` has two different persons (index 0 and 1) in the same dataset without stable labeling. Deferred.

**GAP 10 — Padded vs unpadded dataset not separated**  
Current calibration footage is unpadded. Shoulder pads distort shoulder keypoint positions. The `foot_width_preview.py` script already accounts for this by using hip width (not shoulder width) as the reference. But back-slope measurements on padded vs unpadded players have not been separated. Deferred.

### 7d. Consent system gaps

**GAP 11 — Token flow not end-to-end tested in production**  
The code path `POST /api/players` → Resend email → parent opens `/consent/[token]` → `POST /api/consent/[token]` has been code-reviewed. The routes are correctly wired. But no confirmation exists that a real email has been delivered in a live environment. Requires `RESEND_API_KEY` and `NEXT_PUBLIC_APP_URL` in Vercel env vars.

**GAP 12 — `recorded_at` column added via Supabase dashboard, not via a migration file originally**  
This is now captured in migration-v7 as a no-op `ADD COLUMN IF NOT EXISTS`. No other columns are known to have been added via the dashboard — but this was only discovered by diffing migration files against live DB state. If new columns are added via the dashboard again, migration files will drift. Discipline: all schema changes should go through migration files first.

---

## 8. IMMEDIATE NEXT STEPS (in priority order)

1. **Decide and resolve the consent gate on the videos page (Gap 1).**  
   The drafted videos page update cannot be saved until this is decided. Options: (a) Remove the consent block from the upload tab entirely — parents of minor coach-managed players must use the token link already sent at player creation. (b) Replace with a "Resend consent email" UI that calls a new `POST /api/players/[playerId]/resend-consent` route. The PATCH backdoor handler should be removed or disabled regardless.

2. **Save, type-check, and commit the TwoClipUpload UI work (Gaps 2, 3).**  
   After the consent decision in step 1:  
   - Write the updated `app/[coachId]/players/[playerId]/videos/page.tsx` to disk (the full draft was produced in the prior session and can be regenerated from conversation context).  
   - Stage and commit `components/TwoClipUpload.tsx`, `types/index.ts`, and the updated videos page together.

3. **Collect bad-stance side-view calibration data (Gap 6).**  
   Run `m1_measure_stills.py --drill ol_stance_3point --quality bad --view side` against bad-stance stills. Curate the output into `m1_results_bad_clean.csv`. Run `validate_clean_csv.py` against it. Once both good and bad CSVs exist for side-view, a calibrated range for M1 back-slope can be defined.

4. **Build the "Submit for analysis" trigger (deferred from the two-clip session prompt).**  
   When both clips are at `analysis_status = 'ready'`, trigger analysis. The upload route already sets `session_ready: true` in the response. The triggering step was explicitly deferred and is the next feature after the UI wiring lands.

5. **Decide the fate of migration-v3 (Gap 5).**  
   Apply it (enables the drill library UI and per-frame feedback annotations), or delete the file if those features are out of scope for the current build phase.

6. **Collect front-view calibration data (Gap 6).**  
   After side-view ranges are established, run front-view footage through `m1_measure_stills.py` and `foot_width_preview.py` to build a parallel front-view calibration dataset.

7. **Resolve or document the self-signup player / TwoClipUpload structural gap (Gap 4).**  
   Either design a `player_session_pairings` table (no coach_id required) or add a `player_account_id` column to `sessions`, then extend `POST /api/sessions` to accept the self-signup path, then wire `TwoClipUpload` into `app/player/dashboard/page.tsx`.

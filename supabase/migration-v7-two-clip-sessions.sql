-- ─────────────────────────────────────────────────────────────────────────────
-- Practice Field — Migration v7: Two-Clip Session Model
-- Run AFTER: migration-v6-coach-managed-consent.sql
--
-- REVIEWABLE — do not apply without review and explicit confirmation.
--
-- What this migration does
-- ────────────────────────
-- 0. Captures recorded_at (already live in DB, added via dashboard).
--    ADD COLUMN IF NOT EXISTS is a no-op on apply.
--
-- 1. Adds view_angle to session_videos (nullable; 'side' or 'front').
--    Nullable — NOT enforced at the column level — so legacy single-clip rows
--    remain valid without any UPDATE to existing data.
--    Enforcement is at the API layer: the upload route rejects any request
--    that omits view_angle.
--
-- 2. Adds a CHECK constraint to analysis_status that covers both the legacy
--    set of values ('pending', 'processing', 'complete', 'failed') and the
--    new two-clip set ('awaiting_side', 'awaiting_front', 'awaiting_both',
--    'ready'). Because all existing rows hold one of the legacy values, the
--    constraint validates cleanly against the current data with no row updates.
--
-- 3. Adds an index on (session_id, view_angle) for the paired-clip look-up
--    the upload route runs after each successful upload.
--
-- Legacy row impact
-- ─────────────────
-- • view_angle on existing rows → NULL (column is nullable; no row is touched)
-- • analysis_status on existing rows → unchanged ('pending', 'complete', etc.)
--   All four legacy values are explicitly included in the new CHECK constraint,
--   so Postgres will accept them when the constraint is validated at ALTER time.
-- • No rows are updated, deleted, or rewritten by this migration.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 0. recorded_at (schema-file capture of dashboard-added column) ───────────
--
-- recorded_at: added directly via Supabase dashboard, captured here for
-- schema-file completeness. Column already exists in live DB —
-- ADD COLUMN IF NOT EXISTS is a no-op on apply.

ALTER TABLE session_videos
  ADD COLUMN IF NOT EXISTS recorded_at DATE DEFAULT CURRENT_DATE;


-- ── 1. view_angle ─────────────────────────────────────────────────────────────
--
-- Nullable so existing rows are unaffected. The upload route enforces NOT NULL
-- at the application layer — any request without this field is rejected 400.

ALTER TABLE session_videos
  ADD COLUMN IF NOT EXISTS view_angle TEXT
    CHECK (view_angle IN ('side', 'front'));

COMMENT ON COLUMN session_videos.view_angle IS
  'Camera angle for this clip. NULL on legacy single-clip rows. '
  'New uploads must be "side" or "front" — enforced by the upload route.';


-- ── 2. analysis_status — add CHECK constraint covering legacy + new values ─────
--
-- video-migration.sql defined this column with DEFAULT ''pending'' but no CHECK.
-- Adding one now. The constraint includes all four legacy values so the ALTER
-- succeeds without touching any existing row.

ALTER TABLE session_videos
  ADD CONSTRAINT chk_sv_analysis_status CHECK (
    analysis_status IN (
      -- Legacy values (existing rows; analysis pipeline still uses these)
      'pending',
      'processing',
      'failed',
      'complete',
      -- Two-clip values (set by the upload route going forward)
      'awaiting_both',     -- session created, no clips uploaded yet
      'awaiting_side',     -- front clip present, waiting for side clip
      'awaiting_front',    -- side clip present, waiting for front clip
      'ready'              -- both clips present; analysis may now be triggered
    )
  );

COMMENT ON COLUMN session_videos.analysis_status IS
  'State machine for this video record. '
  'Legacy single-clip values: pending | processing | failed | complete. '
  'Two-clip values (set by upload route): awaiting_both | awaiting_side | awaiting_front | ready | complete.';


-- ── 3. Index for paired-clip look-up ─────────────────────────────────────────
--
-- The upload route runs:
--   SELECT id FROM session_videos
--   WHERE session_id = $1 AND view_angle = $2
-- after every upload to decide whether to set analysis_status = 'ready'.
-- This partial index makes that query fast and only indexes rows that can
-- actually participate in pairing.

CREATE INDEX IF NOT EXISTS idx_sv_session_view
  ON session_videos(session_id, view_angle)
  WHERE session_id IS NOT NULL AND view_angle IS NOT NULL;

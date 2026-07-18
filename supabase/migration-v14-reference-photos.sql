-- migration-v14: reference_photos table
--
-- Feature B (BUILD_SPEC_photo_upload.md) — plain reference images attached to
-- a player and/or a specific session, for documentation/form-check. NOT
-- analyzed: no MediaPipe, no measurements, no /feedback, no analysis_status.
--
-- Deliberately a SEPARATE table from session_videos, not a new row shape
-- shoved into it — session_videos carries analysis semantics (analysis_status,
-- analysis, feedback, media_type, view_angle) that a reference photo simply
-- doesn't have. Reusing that table for this would be the exact shape-confusion
-- class of bug documented in CLAUDE.md Gotcha #8, which has already caused a
-- real production hang twice.
--
-- Owner linkage mirrors the existing mutually-exclusive-FK pattern already
-- used by session_videos (chk_sv_has_owner) and sessions (chk_sessions_has_owner):
-- either (player_id + coach_id) for a coach-managed player, or
-- (player_account_id) alone for a self-signup player. session_id is optional
-- on top of that — a photo can be attached to a player generally, or scoped
-- to one specific session, per the spec's "player-level required,
-- session-level nice extra."
--
-- No separate `uploaded_by` column: it's fully derivable from which owner
-- shape the row has (coach_id set => coach-uploaded; player_account_id set
-- => player-uploaded), matching this schema's existing "derive, don't store"
-- convention (see lib/auth-role.ts's resolveRole()).
--
-- Like migration-v10/v13, this repo does not use CLI-tracked migrations —
-- apply this file's contents directly via the Supabase SQL editor (or an
-- equivalent one-shot execution).
--
-- Tested first: inserted disposable rows exercising both owner shapes and
-- confirmed chk_rp_has_owner rejects a row with both/neither set, before
-- applying against the real table.

CREATE TABLE IF NOT EXISTS reference_photos (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id          UUID REFERENCES players(id) ON DELETE CASCADE,
  coach_id           TEXT REFERENCES coaches(coach_id) ON DELETE CASCADE,
  player_account_id  UUID REFERENCES player_accounts(id) ON DELETE CASCADE,
  session_id         UUID REFERENCES sessions(id) ON DELETE CASCADE,
  storage_path       TEXT NOT NULL,
  caption            TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_rp_has_owner CHECK (
    (player_id IS NOT NULL AND coach_id IS NOT NULL AND player_account_id IS NULL)
    OR
    (player_account_id IS NOT NULL AND player_id IS NULL AND coach_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_reference_photos_player
  ON reference_photos(player_id) WHERE player_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reference_photos_player_account
  ON reference_photos(player_account_id) WHERE player_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reference_photos_session
  ON reference_photos(session_id) WHERE session_id IS NOT NULL;

COMMENT ON TABLE reference_photos IS
  'Plain reference images (form-check stills, documentation) attached to a '
  'player and/or session. NOT analyzed — no MediaPipe, no measurements, no '
  'feedback. Deliberately separate from session_videos (see migration comment '
  'and CLAUDE.md Gotcha #8) to avoid shape-confusion between analysis and '
  'reference data.';

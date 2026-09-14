-- migration-v23-fault-tiering-columns.sql
-- Two-dimensional fault tiering (see FAULT_TIERING_PLAN.md, Decision 2).
--
-- Adds two INDEPENDENT tagging dimensions to checkpoints_v2, one fault per row
-- (Option A — row-per-fault split; these columns are 1:1 with the row, like
-- check_type/threshold_parameters already are):
--
--   player_tier    — pedagogical readiness. Ordinal ENUM; declaration order IS the
--                    "unlock" order (Fundamental < Developing < Advanced). The resolver
--                    keeps a row iff row.player_tier <= viewer level. Cumulative: an
--                    Advanced viewer sees the full stack; tier NEVER hides fundamentals.
--   fault_severity — how game-critical the mistake is, independent of player level.
--
-- NULL handling is DELIBERATELY opposite to measurable_by_pose:
--   measurable_by_pose NULL -> fail-CLOSED (row can't be safely processed -> excluded).
--   player_tier/fault_severity NULL -> fail-OPEN (content is valid, just untagged on an
--     extra dimension -> still surfaces). Hiding correct coaching content that nobody has
--     tagged yet would be the real danger. Different risk profiles, opposite defaults.
--
-- Additive + nullable: safe on all existing rows (all start NULL / untriaged).
-- Matches the existing named-enum convention already used for measurable_by_pose,
-- camera_angle, static_dynamic, thresholds_status.

DO $$ BEGIN
  CREATE TYPE player_tier AS ENUM ('Fundamental', 'Developing', 'Advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fault_severity AS ENUM ('Critical', 'Major', 'Minor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE checkpoints_v2 ADD COLUMN IF NOT EXISTS player_tier    player_tier;
ALTER TABLE checkpoints_v2 ADD COLUMN IF NOT EXISTS fault_severity fault_severity;

COMMENT ON COLUMN checkpoints_v2.player_tier IS
  'Pedagogical readiness (ordinal: Fundamental<Developing<Advanced). Resolver keeps row iff player_tier <= viewer level OR NULL (fail-open). Cumulative; never hides fundamentals from advanced players.';
COMMENT ON COLUMN checkpoints_v2.fault_severity IS
  'How game-critical the fault is (Critical/Major/Minor), independent of player_tier. NULL = not yet rated (fail-open).';

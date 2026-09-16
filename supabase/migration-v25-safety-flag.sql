-- migration-v25: injury-risk "safety" marker on checkpoints_v2 (fault-tiering, 2026-09-16)
--
-- Safety faults (e.g. leading with the head into a defender's knees, diving at the ankles) are a
-- CATEGORICALLY different kind of stakes from the Critical/Major/Minor performance scale — physical
-- injury, not winning/losing a rep. They are marked with this boolean, kept OFF the fault_severity
-- scale, and the layer3 resolver surfaces them UNCONDITIONALLY: exempt from the player_tier unlock,
-- the min_severity floor, and the max_checkpoints display cap. A beginner sees them day one, every rep.
--
-- Additive + safe: NOT NULL DEFAULT false, so every existing row is a non-safety fault until explicitly
-- flagged. Orthogonal to player_tier/fault_severity (migration-v23) — a safety fault still carries a
-- player_tier for ordering, but its SURFACING never depends on any filter.

ALTER TABLE checkpoints_v2
  ADD COLUMN IF NOT EXISTS is_safety boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN checkpoints_v2.is_safety IS
  'Injury-risk fault. Resolver surfaces unconditionally, bypassing player_tier/min_severity/max_checkpoints. Not a point on the fault_severity scale.';

-- migration-v24-uniq-checkpoint-add-fault-trigger.sql
-- Fault-tiering Option A split, structural prerequisite (see FAULT_TIERING_PLAN.md).
--
-- The catalogue's identity constraint was:
--   uniq_checkpoint_v2 UNIQUE (group_name, position, technique, variation, formation,
--                              phase, ideal_execution_standard)
-- i.e. ONE checkpoint per (phase + ideal). That bakes in the one-fault-per-row assumption
-- at the DB level: a phase can carry exactly one row, so a phase whose fault_trigger bundles
-- several distinct faults CANNOT be split into one-fault-per-row (the children share phase +
-- the shared phase-level ideal and collide on this key).
--
-- Fault-tiering (Option A) makes fault_trigger part of a checkpoint's identity: one phase can
-- have one correct ideal and several INDEPENDENT ways to fail it (proven concretely — DB row
-- 1772: one phase, two faults needing different landmarks AND different tiers). So widen the
-- key to include fault_trigger.
--
-- SAFETY (verified on live data before applying, 2026-09-15):
--   * Widening a UNIQUE key (adding a column) is strictly MORE permissive — it can only ALLOW
--     rows the old key rejected (same old-tuple, different fault_trigger); it can NEVER permit
--     a row the old key allowed. A TRUE full duplicate (same old-tuple AND same fault_trigger)
--     still collides. No integrity is lost, only the artificial one-row-per-phase ceiling.
--   * 0 existing rows share the full widened tuple, so the ADD succeeds on current data.
--   * max widened-key size = 1073 bytes, well under the ~2704-byte btree unique-index limit.

ALTER TABLE checkpoints_v2 DROP CONSTRAINT uniq_checkpoint_v2;

ALTER TABLE checkpoints_v2 ADD CONSTRAINT uniq_checkpoint_v2
  UNIQUE (group_name, position, technique, variation, formation, phase,
          ideal_execution_standard, fault_trigger);

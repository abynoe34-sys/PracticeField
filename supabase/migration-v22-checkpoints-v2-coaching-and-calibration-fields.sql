-- migration-v22-checkpoints-v2-coaching-and-calibration-fields.sql
-- Applied to production 2026-09-07 via Supabase MCP.
--   DDL  : Supabase migration `checkpoints_v2_add_coaching_and_calibration_fields`
--   Data : executed as a one-off UPDATE (recorded below for a complete audit trail)
--
-- Context: Supabase `checkpoints_v2` (1,638 rows, rebuilt taxonomy) is now the OFFICIAL
-- source of truth for the ruleset catalogue. Airtable + service/rulesets/build_ruleset.py
-- are deprecated (do NOT author new content there). This migration (a) adds the coaching
-- and Layer-4 calibration fields checkpoints_v2 lacked, and (b) migrates the ONLY
-- human-authored coaching content that existed in the legacy qb_ruleset.json — 22 rows
-- carrying coaching_cue (4 unique cues); there was zero correction_strategy content
-- anywhere to migrate.
--
-- The 22 landings were resolved by CONCEPT (not row-order, and NOT by the legacy
-- "title + Ideal Execution Standard" join, which lands 1/22 here: final_checkpoint is
-- NULL on all rows and the IES prose was reworded in the rebuild). Each of the 22 rows
-- was read back individually to confirm the correct cue landed on the correct row.
-- Preserved source: service/rulesets/preserved_coaching_content.json.
--
-- NOTE: adding check_type / threshold_parameters here resolves the previously-held
-- Airtable schema-change approval outright (Layer 4's two structured-threshold fields).

-- (a) DDL — additive, nullable columns
alter table public.checkpoints_v2
  add column if not exists coaching_cue         text,
  add column if not exists correction_strategy  text,
  add column if not exists check_type           text,
  add column if not exists threshold_parameters text;

comment on column public.checkpoints_v2.coaching_cue is
  'Human-authored coaching cue (the North-Star "how to correct" beat). Migrated from qb_ruleset.json coaching_cue.';
comment on column public.checkpoints_v2.correction_strategy is
  'Human-authored correction/drill strategy. Currently unpopulated everywhere (deferred content work).';
comment on column public.checkpoints_v2.check_type is
  'Layer 4 check type (one of the nine). Authored once per row; formerly the held Airtable schema-change item.';
comment on column public.checkpoints_v2.threshold_parameters is
  'Layer 4 calibrated threshold params as key:value text. Empty on Draft; required (non-empty) once thresholds_status=Calibrated.';

-- (b) Data — migrate the 22 legacy coaching cues by concept
--   A (7): Ball Carriage — two-hand carriage THROUGH THE DROP  (Drop-Back 3/5/7 Step)
--          NB: NOT the Ball Carry/Ball Security technique (scrambling ball security — different concept)
--   B (7): Foot Placement — feet glide / cleats cutting grass   (Drop-Back 3/5/7 Step)
--   C (7): Step Sequence  — progression rhythm & spacing         (Drop-Back 3/5/7 Step)
--   D (1): Stance foot alignment — non-throwing foot back        (Under Center Stance)
update public.checkpoints_v2 as c set coaching_cue = v.cue, updated_at = now()
from (values
  (248, 'Two hands on it — relaxed, not loose.'),
  (254, 'Two hands on it — relaxed, not loose.'),
  (317, 'Two hands on it — relaxed, not loose.'),
  (332, 'Two hands on it — relaxed, not loose.'),
  (480, 'Two hands on it — relaxed, not loose.'),
  (495, 'Two hands on it — relaxed, not loose.'),
  (508, 'Two hands on it — relaxed, not loose.'),
  (240, 'Cut grass with your cleats — feet glide, knees don''t cross.'),
  (259, 'Cut grass with your cleats — feet glide, knees don''t cross.'),
  (315, 'Cut grass with your cleats — feet glide, knees don''t cross.'),
  (331, 'Cut grass with your cleats — feet glide, knees don''t cross.'),
  (477, 'Cut grass with your cleats — feet glide, knees don''t cross.'),
  (494, 'Cut grass with your cleats — feet glide, knees don''t cross.'),
  (516, 'Cut grass with your cleats — feet glide, knees don''t cross.'),
  (247, 'Cut grass with your cleats — stay low, don''t bounce.'),
  (257, 'Cut grass with your cleats — stay low, don''t bounce.'),
  (322, 'Cut grass with your cleats — stay low, don''t bounce.'),
  (330, 'Cut grass with your cleats — stay low, don''t bounce.'),
  (478, 'Cut grass with your cleats — stay low, don''t bounce.'),
  (493, 'Cut grass with your cleats — stay low, don''t bounce.'),
  (506, 'Cut grass with your cleats — stay low, don''t bounce.'),
  (542, 'Non-throwing foot back — load it, don''t false step.')
) as v(id, cue) where c.id = v.id;

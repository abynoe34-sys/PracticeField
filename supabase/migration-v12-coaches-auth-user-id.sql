-- migration-v12: link coaches to real Supabase Auth users (unified accounts)
--
-- Additive and nullable — no existing row is touched or required to have a
-- value. Legacy coach rows created before unified sign-up (including the
-- ~30 garbage rows auto-vivified by the old getOrCreateCoach() bug — see
-- CLAUDE.md Gotcha #13) are deliberately NOT migrated or backfilled; they
-- simply have no auth_user_id and are inert under the new auth model.
-- Every real coach account going forward is created fresh through
-- POST /api/coaches/signup, which sets this column at creation time.
--
-- Rollback: ALTER TABLE coaches DROP COLUMN auth_user_id;
--
-- Verified before applying to live data: inserted a disposable coach row
-- referencing a real auth.users id (confirmed FK accepts it), confirmed a
-- second row with the same auth_user_id is rejected (unique constraint),
-- then deleted the disposable row.

ALTER TABLE coaches
  ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id);

COMMENT ON COLUMN coaches.auth_user_id IS
  'Links a coach row to a real Supabase Auth user (unified sign-up, 2026-07-18). '
  'Nullable — legacy coach rows created before unified accounts (auto-vivified by '
  'the old getOrCreateCoach() bug, or otherwise never authenticated) have no '
  'value here and are not migrated; they are inert under the new auth model.';

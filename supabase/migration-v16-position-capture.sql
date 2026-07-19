-- migration-v16: position capture (Solo-player analysis access + Position capture build)
--
-- Two additive, nullable columns. Both safe on existing rows (all NULL).
--
-- 1. player_accounts.position — the self-signup player's PROFILE football
--    position, mirroring the pre-existing players.position (free-text
--    FootballPosition: 'QB','OL','C','OG','OT',...). Deliberately NO CHECK,
--    identical to players.position — this is the broad drill/roster taxonomy,
--    NOT the OL-stance analysis vocabulary. Coach-created players already have
--    this column captured on the add-player form; solo accounts had no
--    equivalent until now.
--
-- 2. sessions.position — the per-session ANALYSIS stance-position snapshot,
--    captured at session start (defaulted from the profile position via
--    lib/position.ts's mapToStancePosition, overridable). CHECK-constrained to
--    the exact OL-stance vocabulary the feedback prompt (service/feedback.py
--    POSITION_CUES) understands — 'guard_tackle' | 'center' — the same
--    constraint session_videos.position already carries (migration-v9).
--
--    Storing it ON THE SESSION is the history-integrity point: the value is a
--    permanent snapshot of what the session was analyzed under, so editing a
--    player's profile position later never rewrites past sessions. The Inngest
--    job reads sessions.position on a fresh DB read and passes it to /analyse,
--    which copies it onto session_videos.position (where feedback reads it).

ALTER TABLE player_accounts
  ADD COLUMN IF NOT EXISTS position TEXT;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS position TEXT
    CHECK (position IN ('guard_tackle','center'));

-- migration-v9: add fault_type, line_side, position to session_videos
-- All three are nullable — existing rows have no value and that is fine.
-- CHECK constraints match the calibration vocabulary in validate_clean_csv.py exactly.

ALTER TABLE session_videos
  ADD COLUMN IF NOT EXISTS fault_type TEXT
    CHECK (fault_type IN ('none','narrow_stance','stagger','head_down','forward_lean','sitting_back')),
  ADD COLUMN IF NOT EXISTS line_side  TEXT
    CHECK (line_side  IN ('left','right')),
  ADD COLUMN IF NOT EXISTS position   TEXT
    CHECK (position   IN ('guard_tackle','center'));

-- migration-v17-selected-frame-time.sql
-- Applied 2026-07-23. Frame-from-video Option B (item 3 upgrade).
--
-- The picked timestamp (seconds) for a video clip. When set, service /analyse
-- windows around it (+/- FRAME_WINDOW_HALF_S) and derives reliability from the
-- neighbourhood's consistency (reusing item 4's aggregate_multi_photo_measurement)
-- instead of treating a client-extracted single still as reliable:false.
-- NULL for plain videos (whole-clip) and photos (unchanged). Additive,
-- nullable — safe on all existing rows.
ALTER TABLE session_videos ADD COLUMN IF NOT EXISTS selected_frame_time REAL;

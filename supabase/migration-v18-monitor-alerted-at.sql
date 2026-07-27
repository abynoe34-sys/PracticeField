-- migration-v18-monitor-alerted-at.sql
-- Applied 2026-07-27. Lightweight pipeline monitoring dedup marker.
--
-- monitor_alerted_at: set by the alerter once it has emailed about a failed/
-- stalled row, so the same incident isn't re-emailed every interval. NULL =
-- not yet alerted. Additive, nullable — safe on all existing rows.
ALTER TABLE session_videos ADD COLUMN IF NOT EXISTS monitor_alerted_at TIMESTAMPTZ;

-- Partial index for the cheap recent-window scan (only un-alerted rows).
CREATE INDEX IF NOT EXISTS idx_sv_monitor ON session_videos (created_at)
  WHERE monitor_alerted_at IS NULL;

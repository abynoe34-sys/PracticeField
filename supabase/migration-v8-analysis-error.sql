-- migration-v8: add analysis pipeline tracking columns to session_videos
--
-- analysis_error: populated by the Inngest job when validation fails or the
--   pipeline encounters an error. Cleared (set to NULL) on each new attempt.
--
-- job_started_at: timestamp written by the Inngest job when it transitions
--   analysis_status from 'ready' to 'processing'. Used for duration tracking
--   and stuck-job detection.

ALTER TABLE session_videos
  ADD COLUMN IF NOT EXISTS analysis_error   TEXT,
  ADD COLUMN IF NOT EXISTS job_started_at   TIMESTAMPTZ;

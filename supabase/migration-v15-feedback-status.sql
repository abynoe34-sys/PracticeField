-- migration-v15: feedback_status + feedback_error on session_videos
--
-- Pipeline hardening (item 2): feedback generation is best-effort and a
-- failure must never break the analysis write — but until now a failure was
-- INVISIBLE. `feedback: null` conflated three different situations:
--   1. feedback not attempted yet (analysis still running / just landed)
--   2. feedback generation was ATTEMPTED and FAILED (OpenAI error, timeout,
--      bad JSON, rate-limit) — the user should see this and be able to retry
--   3. feedback intentionally NOT generated because there was no usable pose
--      data (nothing to write; not a failure)
--
-- feedback_status disambiguates them so the UI can show a real failed state
-- (with a retry affordance) instead of a permanent silent "pending", and so
-- the auto-refresh poller has a genuine terminal signal to stop on.
--
--   'pending'  — default; not yet attempted, or in progress
--   'complete' — feedback generated and written
--   'failed'   — generation attempted and threw; feedback stays null,
--                feedback_error holds the reason
--   'skipped'  — no usable pose data; feedback deliberately not generated
--
-- feedback_error carries the failure reason (truncated) for 'failed' rows,
-- for debugging + optionally surfacing. NULL otherwise.
--
-- Like prior migrations this repo applies directly via the SQL editor, not a
-- CLI migration runner. Additive + backfill only — no data loss.

ALTER TABLE session_videos
  ADD COLUMN IF NOT EXISTS feedback_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (feedback_status IN ('pending', 'processing', 'complete', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS feedback_error TEXT;

-- Backfill: any row that already has feedback is 'complete'. Everything else
-- keeps the 'pending' default — including the handful of historical side rows
-- that have analysis but no feedback (previously-silent failures). Those will
-- flip to 'complete'/'failed' the next time feedback is (re)generated for
-- them via the new retry path; leaving them 'pending' is honest (we can't
-- retroactively know whether they failed or were skipped).
UPDATE session_videos SET feedback_status = 'complete' WHERE feedback IS NOT NULL;

COMMENT ON COLUMN session_videos.feedback_status IS
  'Lifecycle of GPT-4o feedback generation, distinct from analysis_status: '
  'pending (not attempted/in progress) | complete | failed (attempted+threw, '
  'see feedback_error) | skipped (no usable pose data). Lets the UI surface a '
  'real failed state with retry instead of a permanent silent "pending".';

COMMENT ON COLUMN session_videos.feedback_error IS
  'Failure reason (truncated) when feedback_status = failed; NULL otherwise.';

-- migration-v10: add feedback column to session_videos
--
-- feedback: populated by the admin-gated POST /feedback route on the Python
--   analysis service. Holds the GPT-4o-mini text feedback writer's output —
--   a coaching-note JSON object derived from the raw MediaPipe measurements
--   already in the `analysis` column. Distinct column (not nested in
--   `analysis`) so the raw measurements stay untouched and the existing
--   isStructuredAnalysis() shape guard in VideoAnalysisCard.tsx is unaffected.
--   NULL until an admin explicitly triggers generation for a session.

ALTER TABLE session_videos
  ADD COLUMN IF NOT EXISTS feedback JSONB;

COMMENT ON COLUMN session_videos.feedback IS
  'GPT-4o-mini text feedback writer output (coaching summary, issues, strengths) '
  'derived from the analysis column measurements. NULL until generated via the '
  'admin-gated POST /feedback route on the Python analysis service.';

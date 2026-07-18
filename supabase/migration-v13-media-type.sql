-- migration-v13: add media_type column to session_videos
--
-- Additive, NOT NULL DEFAULT 'video' — every existing row is a video today,
-- so the default backfills them correctly with zero data loss and no
-- separate UPDATE pass needed. Enables Feature A (analyzed stance photos,
-- BUILD_SPEC_photo_upload.md): a side+front photo pair flows through the
-- exact same session_videos row shape and analysis_status lifecycle as
-- video, distinguished only by this column so service/main.py's /analyse
-- can pick MediaPipe's IMAGE vs VIDEO running mode.
--
-- Like migration-v10's `feedback` column, this repo does not use CLI-tracked
-- migrations — apply this file's contents directly via the Supabase SQL
-- editor (or an equivalent one-shot execution), not `supabase migration up`.
--
-- Tested first on a disposable row (insert with each of 'video'/'photo',
-- confirmed the CHECK constraint rejects any other value) before applying,
-- per this repo's established migration discipline (see migration-v11/v12).

ALTER TABLE session_videos
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'video'
    CHECK (media_type IN ('video', 'photo'));

COMMENT ON COLUMN session_videos.media_type IS
  'Which kind of file this row holds — ''video'' (multi-frame, existing path) '
  'or ''photo'' (single still, Feature A). Both flow through the same '
  'analysis_status lifecycle; service/main.py branches on this to choose '
  'MediaPipe VIDEO vs IMAGE running mode. Default ''video'' backfills all '
  'pre-existing rows unchanged.';

-- Practice Field — Video Analysis Migration
-- Run this in Supabase SQL Editor AFTER migrations.sql

-- ─── Session Videos ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_videos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id       UUID REFERENCES sessions(id) ON DELETE CASCADE,
  player_id        UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  coach_id         TEXT NOT NULL REFERENCES coaches(coach_id) ON DELETE CASCADE,

  -- Storage
  storage_path     TEXT NOT NULL,        -- path inside Supabase Storage bucket
  public_url       TEXT,                 -- signed URL cached here
  file_name        TEXT,
  file_size_bytes  BIGINT,
  duration_seconds FLOAT,
  thumbnail_path   TEXT,                 -- first-frame thumbnail

  -- Analysis state
  analysis_status  TEXT DEFAULT 'pending',
  -- 'pending' | 'processing' | 'complete' | 'failed'

  -- AI Analysis result (rich JSONB)
  analysis         JSONB,
  -- shape: {
  --   overall_grade: 'A'|'B'|'C'|'D',
  --   summary: string,
  --   technique_scores: { stance, first_step, acceleration, mechanics, ... },
  --   issues: [{ issue, root_cause, severity, timestamp_hint, coaching_cue }],
  --   strengths: [{ strength, evidence }],
  --   comparison: { trend, improvement_areas, decline_areas, notes },
  --   recommended_modifications: [{ action, priority, reason }],
  --   frames_analyzed: number
  -- }

  -- Frame snapshots stored alongside video
  frame_paths      TEXT[],               -- paths to extracted frame images

  -- Metadata
  label            TEXT,                 -- e.g. "Route running drill", "Pass rush"
  drill_type       TEXT,                 -- e.g. "agility", "technique", "speed"
  notes            TEXT,                 -- coach manual note on this clip
  is_baseline      BOOLEAN DEFAULT FALSE,-- marks the reference "before" video

  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_videos_player_id  ON session_videos(player_id);
CREATE INDEX IF NOT EXISTS idx_session_videos_session_id ON session_videos(session_id);
CREATE INDEX IF NOT EXISTS idx_session_videos_coach_id   ON session_videos(coach_id);
CREATE INDEX IF NOT EXISTS idx_session_videos_status     ON session_videos(analysis_status);

-- RLS
ALTER TABLE session_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_videos" ON session_videos FOR ALL USING (true);

-- ─── Supabase Storage Bucket ─────────────────────────────────────────────────
-- Run this separately in Supabase Dashboard → Storage → New Bucket
-- OR via this SQL:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-videos',
  'session-videos',
  false,                               -- private bucket, access via signed URLs
  524288000,                           -- 500MB max per file
  ARRAY['video/mp4','video/quicktime','video/webm','video/x-msvideo','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy — allow service role full access
CREATE POLICY "service_role_storage" ON storage.objects FOR ALL USING (true);

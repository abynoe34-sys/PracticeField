-- ─────────────────────────────────────────────────────────────────────────────
-- Practice Field  v3 — Drill Library + Technique Analyzer
-- ─────────────────────────────────────────────────────────────────────────────
-- Prerequisites: migrations.sql and video-migration.sql must already be applied.
-- Run in Supabase SQL Editor → New query → paste → Run.
--
-- What this creates:
--   drills         — coach-authored drill definitions (DB layer for the drill library)
--   videos         — instructional demo videos linked to drills  (≠ session_videos)
--   feedback_notes — per-frame drawing/text annotations on session_videos frames
--
-- Storage:
--   drill-library bucket  — separate from session-videos; different lifecycle,
--                           potentially shareable across a coach's whole team
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── drills ──────────────────────────────────────────────────────────────────
-- Persists drill/exercise definitions that coaches create and manage.
-- NULL coach_id  = system-level entry (shared across all coaches, read-only).
-- Set  coach_id  = coach-owned entry (only their team sees it in lists).
--
-- Complements the hardcoded TS position-drill libraries: those power the
-- AI/template engine; this table powers the browsable UI + video demos.

CREATE TABLE IF NOT EXISTS drills (
  id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- NULL = system drill (visible to everyone), SET = coach-private drill
  coach_id        TEXT    REFERENCES coaches(coach_id) ON DELETE CASCADE,

  name            TEXT    NOT NULL,
  description     TEXT,

  -- Maps to Exercise['category'] in types/index.ts
  category        TEXT    CHECK (category IN (
                    'warmup','agility','strength','footwork',
                    'speed','technique','conditioning','cooldown'
                  )),

  -- Which positions this drill is relevant for: ['CB','NB','FS','SS',...]
  positions       TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- e.g. 'slot_coverage', 'press_coverage', 'run_support', 'blitz'
  technique_area  TEXT,

  coaching_cue    TEXT,
  common_mistake  TEXT,

  -- Pain-point keyword array — same shape as fixes[] in the TS libraries
  fixes           TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Ordered list of difficulty progressions
  progressions    TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- FALSE = draft; coach can hide a drill before it's ready
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,

  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drills_coach_id     ON drills(coach_id);
CREATE INDEX IF NOT EXISTS idx_drills_category     ON drills(category);
-- GIN indexes let Postgres efficiently answer "does this array overlap with X?"
CREATE INDEX IF NOT EXISTS idx_drills_positions    ON drills USING GIN(positions);
CREATE INDEX IF NOT EXISTS idx_drills_fixes        ON drills USING GIN(fixes);


-- ─── videos ──────────────────────────────────────────────────────────────────
-- Instructional / demo videos attached to drill library entries.
-- PURPOSE: "here's how to run this drill" — NOT player technique footage.
-- Player footage lives in session_videos (video-migration.sql).
--
-- One drill can have many demo videos (e.g. different angle, beginner vs elite).
-- is_featured marks the primary/thumbnail demo shown in the drill card UI.

CREATE TABLE IF NOT EXISTS videos (
  id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Which drill this video demonstrates (nullable: orphan clips are allowed)
  drill_id         UUID    REFERENCES drills(id) ON DELETE SET NULL,

  coach_id         TEXT    NOT NULL REFERENCES coaches(coach_id) ON DELETE CASCADE,

  -- Supabase Storage  (drill-library bucket)
  storage_path     TEXT    NOT NULL,           -- e.g. "ABC123/drills/<uuid>.mp4"
  public_url       TEXT,                       -- cached signed URL (refreshed on read)
  file_name        TEXT,
  file_size_bytes  BIGINT,
  duration_seconds FLOAT,
  thumbnail_path   TEXT,                       -- first-frame or custom thumbnail

  -- Display metadata
  title            TEXT,                       -- e.g. "W Drill — Hip Turn Close-Up"
  notes            TEXT,                       -- coach caption / context

  -- Pinned as the primary demo for this drill (only one per drill should be TRUE)
  is_featured      BOOLEAN NOT NULL DEFAULT FALSE,

  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_drill_id  ON videos(drill_id);
CREATE INDEX IF NOT EXISTS idx_videos_coach_id  ON videos(coach_id);


-- ─── feedback_notes ──────────────────────────────────────────────────────────
-- Per-frame coaching annotations on player technique videos (session_videos).
-- Powers the frame-step technique analyzer:
--   • Coach scrubs to a frame, draws arrows/circles/lines/text on the freeze frame
--   • Each annotation set is saved as a JSONB array on the specific frame index
--   • On reload, annotations are re-painted at the correct frame position
--
-- One row per (video × coach × frame_index) — the UNIQUE constraint makes
-- upserting safe: saving a frame's annotations is always an INSERT … ON CONFLICT
-- DO UPDATE, never a concern about duplicate rows.

CREATE TABLE IF NOT EXISTS feedback_notes (
  id                 UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- The player technique video being annotated
  video_id           UUID    NOT NULL REFERENCES session_videos(id) ON DELETE CASCADE,
  coach_id           TEXT    NOT NULL REFERENCES coaches(coach_id)  ON DELETE CASCADE,
  player_id          UUID    NOT NULL REFERENCES players(id)        ON DELETE CASCADE,

  -- Which frame
  frame_index        INT     NOT NULL,         -- 0-based index into session_videos.frame_paths[]
  frame_timestamp_ms FLOAT,                    -- millisecond offset in the source video (for seek)

  -- Drawing annotations — array of shape objects rendered over the frame in the UI.
  -- All coordinates are NORMALISED (0.0–1.0) relative to frame width/height so
  -- they scale correctly when the video is displayed at different sizes.
  --
  -- Shape of each element:
  --   {
  --     "id":     "<uuid>",           -- client-generated, stable across saves
  --     "type":   "arrow"|"circle"|"line"|"freehand"|"text"|"angle",
  --     "color":  "#FF3B30",          -- hex color string
  --     "width":  2,                  -- stroke width (logical px, normalised by frame width)
  --     "points": [{"x": 0.3, "y": 0.5}, ...],   -- path / anchor points
  --     "text":   "Drive the hip",    -- only present when type = "text"
  --     "label":  "Hip angle"         -- optional short label for any shape
  --   }
  annotations        JSONB   NOT NULL DEFAULT '[]'::JSONB,

  -- Plain-text coaching observation for this frame (separate from drawn shapes)
  text_note          TEXT,

  -- Intent / severity flag for this frame's annotation
  technique_flag     TEXT    DEFAULT 'note'
                     CHECK (technique_flag IN ('correct','incorrect','focus','note')),

  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One annotation set per video + coach + frame — upsert-safe
  UNIQUE (video_id, coach_id, frame_index)
);

CREATE INDEX IF NOT EXISTS idx_feedback_video_id     ON feedback_notes(video_id);
CREATE INDEX IF NOT EXISTS idx_feedback_coach_id     ON feedback_notes(coach_id);
CREATE INDEX IF NOT EXISTS idx_feedback_player_id    ON feedback_notes(player_id);
-- Composite index: the most common query is "all annotations for video X ordered by frame"
CREATE INDEX IF NOT EXISTS idx_feedback_video_frame  ON feedback_notes(video_id, frame_index);


-- ─── updated_at auto-maintenance ─────────────────────────────────────────────
-- Keeps updated_at accurate on every row edit without application-layer effort.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Guard: only create if not already attached (idempotent re-runs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'drills_updated_at'
  ) THEN
    CREATE TRIGGER drills_updated_at
      BEFORE UPDATE ON drills
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'feedback_notes_updated_at'
  ) THEN
    CREATE TRIGGER feedback_notes_updated_at
      BEFORE UPDATE ON feedback_notes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;


-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Consistent with migrations.sql and video-migration.sql:
--   • RLS is ENABLED on every table (defense-in-depth)
--   • Service-role policy grants full access to server API routes
--   • Real per-coach isolation is enforced at the API layer via .eq('coach_id', coachId)
--
-- When Supabase Auth is wired up, swap the service_role policies for the
-- commented-out JWT policies below — no schema change required.

ALTER TABLE drills         ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_drills"
  ON drills         FOR ALL USING (true);

CREATE POLICY "service_role_drill_videos"
  ON videos         FOR ALL USING (true);

CREATE POLICY "service_role_feedback_notes"
  ON feedback_notes FOR ALL USING (true);

-- ── Future auth policies — uncomment when Supabase Auth JWT is configured ────
--
-- Coaches see system drills (coach_id IS NULL) plus their own:
-- CREATE POLICY "coach_read_drills" ON drills
--   FOR SELECT USING (coach_id IS NULL OR coach_id = auth.jwt() ->> 'coach_id');
--
-- CREATE POLICY "coach_write_own_drills" ON drills
--   FOR ALL USING (coach_id = auth.jwt() ->> 'coach_id');
--
-- CREATE POLICY "coach_own_drill_videos" ON videos
--   FOR ALL USING (coach_id = auth.jwt() ->> 'coach_id');
--
-- CREATE POLICY "coach_own_feedback" ON feedback_notes
--   FOR ALL USING (coach_id = auth.jwt() ->> 'coach_id');


-- ─── Storage Bucket — Drill Demo Videos ──────────────────────────────────────
-- Separate from session-videos: demo clips have a different lifecycle
-- (not tied to a session or player) and may eventually be shareable.
-- The existing service_role_storage policy on storage.objects covers this bucket.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'drill-library',
  'drill-library',
  false,          -- private; served via signed URLs, same as session-videos
  524288000,      -- 500 MB per file
  ARRAY[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

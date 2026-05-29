-- Practice Field v1 — Supabase Database Migrations
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Coaches ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coaches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id    TEXT UNIQUE NOT NULL,          -- Human-readable code (ABC123XYZ)
  name        TEXT,
  email       TEXT,
  sport       TEXT DEFAULT 'american_football',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Players ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id         TEXT NOT NULL REFERENCES coaches(coach_id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  position         TEXT,                      -- QB, WR, RB, OL, DL, LB, CB, S, etc.
  experience_level TEXT DEFAULT 'beginner',   -- beginner | intermediate | elite
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coach_id, name)
);

-- ─── Sessions ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  coach_id      TEXT NOT NULL REFERENCES coaches(coach_id) ON DELETE CASCADE,
  session_date  DATE NOT NULL,
  strengths     TEXT[]  DEFAULT ARRAY[]::TEXT[],
  improvements  TEXT[]  DEFAULT ARRAY[]::TEXT[],
  root_causes   JSONB   DEFAULT '{}'::JSONB,  -- { "area": "root cause text" }
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_player_id ON sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_sessions_coach_id  ON sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date      ON sessions(session_date DESC);

-- ─── Training Plans ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_plans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id        UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  coach_id         TEXT NOT NULL REFERENCES coaches(coach_id) ON DELETE CASCADE,
  pain_points      TEXT[]  DEFAULT ARRAY[]::TEXT[],
  experience_level TEXT    NOT NULL DEFAULT 'beginner',
  commitment_weeks INT     NOT NULL DEFAULT 6,
  exercises        JSONB   NOT NULL DEFAULT '[]'::JSONB,
  -- exercise shape: [{ name, sets, reps, duration, why, category }, ...]
  generated_by     TEXT    DEFAULT 'coach',   -- 'ai' | 'coach'
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at       TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_training_plans_player_id ON training_plans(player_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_coach_id  ON training_plans(coach_id);

-- ─── Progress Metrics ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress_metrics (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  coach_id     TEXT NOT NULL REFERENCES coaches(coach_id) ON DELETE CASCADE,
  metric_name  TEXT NOT NULL,   -- "40-Yard Dash (sec)", "Vertical Jump (in)", etc.
  value        FLOAT NOT NULL,
  measured_at  DATE  NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_player_id   ON progress_metrics(player_id);
CREATE INDEX IF NOT EXISTS idx_progress_metric_name ON progress_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_progress_measured_at ON progress_metrics(measured_at);

-- ─── Row Level Security (RLS) ────────────────────────────────────────────────
-- In v1 we use the service role key on the server, so RLS is a secondary layer.
-- Enable it for defense-in-depth, but API routes bypass via service role.

ALTER TABLE coaches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE players          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_metrics ENABLE ROW LEVEL SECURITY;

-- Allow all operations for the service_role (server API routes use this)
CREATE POLICY "service_role_coaches"          ON coaches          FOR ALL USING (true);
CREATE POLICY "service_role_players"          ON players          FOR ALL USING (true);
CREATE POLICY "service_role_sessions"         ON sessions         FOR ALL USING (true);
CREATE POLICY "service_role_training_plans"   ON training_plans   FOR ALL USING (true);
CREATE POLICY "service_role_progress_metrics" ON progress_metrics FOR ALL USING (true);

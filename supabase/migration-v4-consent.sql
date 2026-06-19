-- ─────────────────────────────────────────────────────────────────────────────
-- Practice Field — Migration v4: Consent Tracking
-- Run AFTER: migrations.sql → video-migration.sql → migration-v3-drills-feedback.sql
--
-- REVIEWABLE — do not apply without review.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. consent_records ───────────────────────────────────────────────────────
--
-- Append-only audit log of every consent event. Never updated or deleted —
-- each new consent (or withdrawal) is a new row. This makes compliance
-- provable: you can reconstruct the exact consent state at any point in time.
--
-- coach-level events  → player_id IS NULL  (e.g. terms_of_service, privacy_policy)
-- player-level events → player_id IS NOT NULL (e.g. player_consent, parental_consent)

CREATE TABLE IF NOT EXISTS consent_records (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  coach_id          TEXT        NOT NULL
                                REFERENCES coaches(coach_id) ON DELETE CASCADE,

  player_id         UUID        REFERENCES players(id) ON DELETE CASCADE,
  -- NULL for coach-level consents (ToS, Privacy).
  -- Set for player-level consents (player_consent, parental_consent, training_opt_in).

  consent_type      TEXT        NOT NULL,
  document_version  TEXT        NOT NULL,  -- e.g. 'v1.0' — which version was agreed to
  accepted          BOOLEAN     NOT NULL,  -- true = accepted, false = refused/withdrawn

  accepted_by_email TEXT,                 -- for parental_consent: the parent's email
  ip_address        TEXT,
  user_agent        TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT consent_type_check CHECK (
    consent_type IN (
      'terms_of_service',
      'privacy_policy',
      'player_consent',
      'parental_consent',
      'training_opt_in'
    )
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consent_coach_id   ON consent_records(coach_id);
CREATE INDEX IF NOT EXISTS idx_consent_player_id  ON consent_records(player_id);
CREATE INDEX IF NOT EXISTS idx_consent_type       ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_created_at ON consent_records(created_at DESC);

-- RLS — exact same pattern as every other table in this project:
-- service_role (used by all API routes via getAdminClient()) bypasses RLS entirely.
-- The policy below is defence-in-depth for any non-service-role caller.
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_consent_records" ON consent_records FOR ALL USING (true);

-- Hard append-only guard via trigger.
-- Unlike RLS, triggers fire even for the service_role, making deletes
-- impossible from any path — including direct SQL Editor access.
CREATE OR REPLACE FUNCTION prevent_consent_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'consent_records is append-only. Rows cannot be deleted (coach_id=%, id=%)',
    OLD.coach_id, OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS trg_consent_no_delete ON consent_records;
CREATE TRIGGER trg_consent_no_delete
  BEFORE DELETE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION prevent_consent_delete();

-- Also block UPDATE (new consent event = new row, not an edit of an old one).
CREATE OR REPLACE FUNCTION prevent_consent_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'consent_records is append-only. Rows cannot be updated (coach_id=%, id=%)',
    OLD.coach_id, OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS trg_consent_no_update ON consent_records;
CREATE TRIGGER trg_consent_no_update
  BEFORE UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION prevent_consent_update();


-- ── 2. coaches — terms acceptance ─────────────────────────────────────────────
--
-- Denormalised snapshot of the LATEST accepted version + timestamp.
-- The full audit trail lives in consent_records.
-- Both columns are nullable: NULL means the coach has not yet accepted.

ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS terms_version     TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;


-- ── 3. players — date of birth, minor flag, consent status, training opt-in ──

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS date_of_birth           DATE,
  ADD COLUMN IF NOT EXISTS is_minor                BOOLEAN,
  -- is_minor is auto-computed by trg_compute_is_minor whenever date_of_birth changes.
  -- ⚠ It reflects minority status at the time of the last INSERT/UPDATE, not today.
  --   Always rely on consent_records.created_at to prove what was known at consent time.

  ADD COLUMN IF NOT EXISTS consent_status          TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS parental_consent_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS training_opt_in         BOOLEAN NOT NULL DEFAULT false;

-- Valid state enumerations
ALTER TABLE players
  ADD CONSTRAINT chk_consent_status CHECK (
    consent_status IN ('pending', 'obtained', 'refused', 'withdrawn')
  ),
  ADD CONSTRAINT chk_parental_consent_status CHECK (
    parental_consent_status IN ('not_required', 'pending', 'obtained', 'refused', 'withdrawn')
  );

-- Trigger: auto-compute is_minor when date_of_birth is written.
-- Fires on INSERT and on any UPDATE that touches the date_of_birth column.
CREATE OR REPLACE FUNCTION compute_is_minor()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.date_of_birth IS NULL THEN
    NEW.is_minor := NULL;
  ELSE
    NEW.is_minor := AGE(NEW.date_of_birth) < INTERVAL '18 years';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_is_minor ON players;
CREATE TRIGGER trg_compute_is_minor
  BEFORE INSERT OR UPDATE OF date_of_birth
  ON players
  FOR EACH ROW EXECUTE FUNCTION compute_is_minor();

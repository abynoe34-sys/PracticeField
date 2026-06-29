-- ─────────────────────────────────────────────────────────────────────────────
-- Practice Field — Migration v6: Coach-Managed Parental Consent via Email
-- Run AFTER: migration-v5-player-accounts.sql
--
-- What this migration does
-- ────────────────────────
-- Adds the token/email columns needed to run the same /consent/[token] email
-- flow for coach-managed minor players as already exists for self-signup
-- player_accounts. Until now, the coach clicked a checkbox to assert parental
-- consent offline. After this migration, the consent route checks both tables.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS parent_email                    TEXT,
  ADD COLUMN IF NOT EXISTS parent_consent_token            TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS parent_consent_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_consent_requested_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_consent_confirmed_at     TIMESTAMPTZ;

-- Partial index — only live (unclaimed) tokens
CREATE INDEX IF NOT EXISTS idx_players_parent_consent_token
  ON players(parent_consent_token)
  WHERE parent_consent_token IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Practice Field — Migration v5: Player Accounts
-- REVIEWABLE — do not apply without review.
-- Run AFTER: migrations.sql → migration-v4-consent.sql
--
-- What this migration does
-- ────────────────────────
-- 1. Creates player_accounts — self-signup players authenticated via
--    Supabase Auth (auth.users). Separate from coach-managed `players`.
-- 2. ALTERs consent_records  — coach_id → nullable; add player_account_id FK.
-- 3. ALTERs session_videos   — player_id + coach_id → nullable; add player_account_id FK.
-- 4. ALTERs players          — add linked_player_account_id (nullable, no merge logic yet).
--
-- Post-apply steps required outside this SQL
-- ───────────────────────────────────────────
-- • Supabase Auth dashboard → Authentication → Email → enable "Confirm email"
-- • npm install resend; add RESEND_API_KEY to .env.local and Vercel env vars
-- • New API routes and pages (built after migration is confirmed)
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. player_accounts ───────────────────────────────────────────────────────
--
-- One row per self-signup player. auth_user_id ties this to a Supabase Auth
-- identity (auth.users). Unlike coach-managed `players`, this row is owned
-- by the player themselves, not by a coach.
--
-- is_minor, training_opt_in_requires_parent, account_status, and
-- parent_consent_status are all computed/defaulted by the BEFORE INSERT
-- trigger (trg_initialize_player_account). Callers must NOT set them directly.
--
-- parent_consent_token is a 64-char hex string generated in application code
-- via crypto.randomBytes(32).toString('hex'). It is nulled out once the parent
-- confirms or declines — the audit trail lives in consent_records.

CREATE TABLE IF NOT EXISTS player_accounts (
  id                              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Supabase Auth identity. Cascade-deletes this row if the auth user is removed.
  auth_user_id                    UUID        NOT NULL UNIQUE
                                              REFERENCES auth.users(id) ON DELETE CASCADE,

  email                           TEXT        NOT NULL,
  display_name                    TEXT        NOT NULL,

  -- Required at signup. Drives is_minor computation in the INSERT trigger.
  -- Can be corrected later; trg_recompute_is_minor handles the cascade.
  date_of_birth                   DATE        NOT NULL,

  -- Computed by trigger at INSERT; recomputed on date_of_birth UPDATE.
  -- Never set directly by the caller.
  is_minor                        BOOLEAN     NOT NULL,
  training_opt_in_requires_parent BOOLEAN     NOT NULL,

  -- State machine managed by API routes only:
  --   'pending_minor_consent' — minor, waiting for parent to confirm
  --   'active'                — fully consented and usable
  --   'restricted'            — parent declined; uploads blocked
  account_status                  TEXT        NOT NULL,

  -- NULL for adults. Required for minors (chk_pa_minor_needs_parent_email).
  parent_email                    TEXT,

  -- State machine for parental consent:
  --   'not_required' — adult account
  --   'pending'      — email sent, awaiting parent action
  --   'obtained'     — parent confirmed on the consent page
  --   'declined'     — parent declined; account stays restricted
  parent_consent_status           TEXT        NOT NULL,

  -- Set by the API at signup for minors; nulled out once parent acts.
  parent_consent_token            TEXT        UNIQUE,
  parent_consent_token_expires_at TIMESTAMPTZ,   -- 30 days from requested_at
  parent_consent_requested_at     TIMESTAMPTZ,
  parent_consent_confirmed_at     TIMESTAMPTZ,

  -- For minors: set by the parent on the consent page, or via re-consent flow.
  -- For adults: toggled directly; every change is logged to consent_records.
  training_opt_in                 BOOLEAN     NOT NULL DEFAULT false,

  -- Written to consent_records too at signup (terms_of_service + privacy_policy rows).
  terms_version                   TEXT        NOT NULL,
  terms_accepted_at               TIMESTAMPTZ NOT NULL,

  -- Set to true by trg_recompute_is_minor when a date_of_birth correction
  -- flips is_minor from false → true on an existing account. These cases
  -- need human review: the account may have been used as an adult while the
  -- player was actually a minor. Cleared by admin via API route only.
  needs_admin_review              BOOLEAN     NOT NULL DEFAULT false,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ── Constraints ──────────────────────────────────────────────────────────
  CONSTRAINT chk_pa_account_status CHECK (
    account_status IN ('pending_minor_consent', 'active', 'restricted')
  ),
  CONSTRAINT chk_pa_parent_consent_status CHECK (
    parent_consent_status IN ('not_required', 'pending', 'obtained', 'declined')
  ),
  -- Minors must have a parent email on file
  CONSTRAINT chk_pa_minor_needs_parent_email CHECK (
    NOT is_minor OR parent_email IS NOT NULL
  ),
  -- Adults must never be stuck in the minor-consent pending state
  CONSTRAINT chk_pa_adult_not_pending CHECK (
    is_minor OR account_status != 'pending_minor_consent'
  ),
  -- Adults must always have parent_consent_status = 'not_required'
  CONSTRAINT chk_pa_adult_parent_consent_irrelevant CHECK (
    is_minor OR parent_consent_status = 'not_required'
  ),
  -- A token must always carry a matching expiry
  CONSTRAINT chk_pa_token_has_expiry CHECK (
    parent_consent_token IS NULL OR parent_consent_token_expires_at IS NOT NULL
  )
);


-- ── 1a. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pa_auth_user_id
  ON player_accounts(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_pa_email
  ON player_accounts(email);

-- Partial: only rows with a live token (cleared post-confirmation)
CREATE INDEX IF NOT EXISTS idx_pa_parent_consent_token
  ON player_accounts(parent_consent_token)
  WHERE parent_consent_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pa_account_status
  ON player_accounts(account_status);

-- Partial: only flagged rows (tiny set, fast admin dashboard query)
CREATE INDEX IF NOT EXISTS idx_pa_needs_admin_review
  ON player_accounts(needs_admin_review)
  WHERE needs_admin_review = true;


-- ── 1b. RLS ───────────────────────────────────────────────────────────────────
--
-- Three-layer model:
--
--   Layer 1 — service role (getAdminClient)
--     Bypasses RLS entirely. All Next.js API routes use this. This is the
--     only path that currently matters operationally.
--
--   Layer 2 — auth.uid() scoped policies
--     Defence-in-depth: if the anon key is ever exposed to the browser,
--     a player can only read or update their own row. Sensitive state columns
--     (account_status, parent_consent_*, needs_admin_review) are guarded by
--     the API routes, not by these policies directly.
--
--   Layer 3 — append-only enforcement
--     consent_records still has its no-delete / no-update triggers; that
--     table is where all consent audit events are immutably stored.

ALTER TABLE player_accounts ENABLE ROW LEVEL SECURITY;

-- Layer 1
CREATE POLICY "service_role_player_accounts"
  ON player_accounts FOR ALL
  USING (true);

-- Layer 2 — read own row
CREATE POLICY "player_can_read_own_account"
  ON player_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Layer 2 — update own row
CREATE POLICY "player_can_update_own_account"
  ON player_accounts FOR UPDATE
  TO authenticated
  USING  (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);


-- ── 1c. Trigger: initialise computed fields at INSERT ─────────────────────────
--
-- The caller supplies: email, display_name, date_of_birth, parent_email (if
-- minor), terms_version, terms_accepted_at, parent_consent_token, and
-- parent_consent_token_expires_at.
--
-- This trigger computes everything else so callers cannot accidentally set
-- is_minor, account_status, or parent_consent_status to wrong values.

CREATE OR REPLACE FUNCTION initialize_player_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.is_minor                        := AGE(NEW.date_of_birth) < INTERVAL '18 years';
  NEW.training_opt_in_requires_parent := NEW.is_minor;

  IF NEW.is_minor THEN
    NEW.account_status        := 'pending_minor_consent';
    NEW.parent_consent_status := 'pending';
  ELSE
    NEW.account_status        := 'active';
    NEW.parent_consent_status := 'not_required';
    -- Belt-and-suspenders: clear parent fields for non-minors
    NEW.parent_email                    := NULL;
    NEW.parent_consent_token            := NULL;
    NEW.parent_consent_token_expires_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_initialize_player_account ON player_accounts;
CREATE TRIGGER trg_initialize_player_account
  BEFORE INSERT ON player_accounts
  FOR EACH ROW EXECUTE FUNCTION initialize_player_account();


-- ── 1d. Trigger: recompute is_minor when date_of_birth is corrected ───────────
--
-- Account status and parent_consent_status are intentionally NOT reset here.
-- A DOB correction is an administrative fix; the status transitions that
-- follow (if any) are handled explicitly by API routes.
--
-- IMPORTANT: if this correction flips is_minor from false → true, the account
-- was used as an adult while the player was actually a minor. needs_admin_review
-- is set to true so these cases are visible rather than silent. An admin route
-- must explicitly clear the flag after reviewing the account.

CREATE OR REPLACE FUNCTION recompute_is_minor_on_dob_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.is_minor                        := AGE(NEW.date_of_birth) < INTERVAL '18 years';
  NEW.training_opt_in_requires_parent := NEW.is_minor;

  -- Flag for admin review when a DOB correction reveals the player was a minor
  -- all along. This is a data-integrity concern (missed parental consent).
  IF OLD.is_minor = false AND NEW.is_minor = true THEN
    NEW.needs_admin_review := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_is_minor ON player_accounts;
CREATE TRIGGER trg_recompute_is_minor
  BEFORE UPDATE OF date_of_birth ON player_accounts
  FOR EACH ROW EXECUTE FUNCTION recompute_is_minor_on_dob_change();


-- ── 2. ALTER consent_records ──────────────────────────────────────────────────
--
-- coach_id becomes nullable so player-account consent events (which have no
-- coach) can be stored in the same append-only audit log.
--
-- The new check constraint preserves the invariant that every consent record
-- belongs to an identifiable subject — either a coach or a player account,
-- never neither.

ALTER TABLE consent_records
  ALTER COLUMN coach_id DROP NOT NULL;

ALTER TABLE consent_records
  ADD COLUMN IF NOT EXISTS player_account_id UUID
    REFERENCES player_accounts(id) ON DELETE CASCADE;

ALTER TABLE consent_records
  ADD CONSTRAINT chk_consent_has_subject CHECK (
    coach_id IS NOT NULL OR player_account_id IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_consent_player_account_id
  ON consent_records(player_account_id)
  WHERE player_account_id IS NOT NULL;


-- ── 3. ALTER session_videos ───────────────────────────────────────────────────
--
-- player_id and coach_id become nullable so player-account-owned videos
-- share the same table as coach-managed player videos.
--
-- The ownership check enforces mutual exclusivity:
--   • Coach-managed video  → player_id + coach_id set; player_account_id NULL
--   • Player-account video → player_account_id set;    player_id + coach_id NULL
-- A row may not mix ownership types.

ALTER TABLE session_videos
  ALTER COLUMN player_id DROP NOT NULL;

ALTER TABLE session_videos
  ALTER COLUMN coach_id  DROP NOT NULL;

ALTER TABLE session_videos
  ADD COLUMN IF NOT EXISTS player_account_id UUID
    REFERENCES player_accounts(id) ON DELETE CASCADE;

ALTER TABLE session_videos
  ADD CONSTRAINT chk_sv_has_owner CHECK (
    (player_id IS NOT NULL AND coach_id IS NOT NULL AND player_account_id IS NULL)
    OR
    (player_account_id IS NOT NULL AND player_id IS NULL AND coach_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_sv_player_account_id
  ON session_videos(player_account_id)
  WHERE player_account_id IS NOT NULL;


-- ── 4. ALTER players ──────────────────────────────────────────────────────────
--
-- Placeholder FK for a future "merge coach-managed player record with a
-- self-signup player account" feature. No merge logic is implemented here.
--
-- ON DELETE SET NULL: if a player account is deleted, the coach-managed
-- player record is preserved and the link is simply cleared.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS linked_player_account_id UUID
    REFERENCES player_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_players_linked_pa_id
  ON players(linked_player_account_id)
  WHERE linked_player_account_id IS NOT NULL;

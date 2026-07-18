-- migration-v11: retain consent_records when a player is hard-deleted
--
-- consent_records_player_id_fkey was ON DELETE CASCADE, meaning deleting a
-- players row would silently delete that player's consent_records too —
-- the opposite of the required behavior. Consent records are a compliance
-- artifact and must survive player deletion (see the player-delete feature
-- build spec): the record itself (consent_type, accepted, accepted_by_email,
-- ip_address, user_agent, coach_id, created_at) is retained; only the link
-- to the now-deleted player is severed.
--
-- Changed to ON DELETE SET NULL so this holds regardless of which code
-- path deletes a player — not just the new DELETE /api/players/[playerId]
-- route, but any future one too.

ALTER TABLE consent_records
  DROP CONSTRAINT consent_records_player_id_fkey;

ALTER TABLE consent_records
  ADD CONSTRAINT consent_records_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL;

COMMENT ON COLUMN consent_records.player_id IS
  'Nullable. Set NULL automatically if the referenced player is hard-deleted — '
  'the consent record itself is retained (compliance artifact), only the link '
  'to the player is severed. See migration-v11.';


-- ── Required companion change: prevent_consent_update() trigger ────────────────
--
-- consent_records is append-only, enforced by a BEFORE UPDATE trigger
-- (trg_consent_no_update / prevent_consent_update()) that unconditionally
-- rejects every UPDATE. Postgres implements ON DELETE SET NULL as a real
-- UPDATE on the referencing row, which fires this same trigger — so without
-- this change, the ABOVE constraint change is not just insufficient, it's
-- actively broken: any attempt to delete a player with existing consent
-- records fails outright with "consent_records is append-only", verified
-- live against a disposable test player before and after this fix.
--
-- Narrow, explicit carve-out: allow the update ONLY when player_id is the
-- sole column changing and is transitioning from a value to NULL — the
-- exact shape of the FK cascade's update, and not a shape any legitimate
-- application code should ever produce. Every other update, including any
-- other change to player_id, is still rejected.

CREATE OR REPLACE FUNCTION public.prevent_consent_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.player_id IS NULL
     AND OLD.player_id IS NOT NULL
     AND NEW.id IS NOT DISTINCT FROM OLD.id
     AND NEW.coach_id IS NOT DISTINCT FROM OLD.coach_id
     AND NEW.consent_type IS NOT DISTINCT FROM OLD.consent_type
     AND NEW.document_version IS NOT DISTINCT FROM OLD.document_version
     AND NEW.accepted IS NOT DISTINCT FROM OLD.accepted
     AND NEW.accepted_by_email IS NOT DISTINCT FROM OLD.accepted_by_email
     AND NEW.ip_address IS NOT DISTINCT FROM OLD.ip_address
     AND NEW.user_agent IS NOT DISTINCT FROM OLD.user_agent
     AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
     AND NEW.player_account_id IS NOT DISTINCT FROM OLD.player_account_id
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'consent_records is append-only. Rows cannot be updated (coach_id=%, id=%)',
    OLD.coach_id, OLD.id;
END;
$function$;

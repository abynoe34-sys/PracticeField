-- migration-v20-drop-permissive-rls-policies.sql
-- Applied to production 2026-08-11 (Supabase migration `drop_permissive_public_rls_policies`).
-- Severity: HIGH — live cross-tenant data exposure (incl. youth consent records).
--
-- THE BUG: eight tables had RLS enabled with a policy NAMED for the service role but
-- created WITHOUT a `TO service_role` clause, so Postgres defaulted the policy to PUBLIC
-- (every role, including anon). Combined with the default anon/authenticated table grants
-- (SELECT/INSERT/UPDATE/DELETE), anyone holding the PUBLIC anon key (it ships in the
-- client bundle) could read, modify and delete every row in every one of these tables.
-- The Supabase linter cannot catch this — RLS is technically "enabled"; it can't tell the
-- policy underneath is a no-op (`using true` for PUBLIC).
--
-- Proven live before the fix (querying as the anon role): coaches 32 rows, consent_records
-- 32, player_accounts 3, players 11, sessions 10 all visible. After the fix: 0 for all.
--
-- THE FIX: every production read/write of these tables goes through the service-role admin
-- client (getAdminClient) — verified by exhaustive repo audit: all 49 `.from()` bindings on
-- these tables are getAdminClient(); the Railway analysis service writes session_videos with
-- the service-role key; the only browser-client (`supabase` proxy) table writes are in
-- scripts/seed.ts, a local dev seed script that is not shipped. The service role BYPASSES
-- RLS, so dropping these no-op policies changes nothing for the app and needs no
-- replacement policy.
--
-- Dropping service_role_player_accounts leaves the two correctly-scoped `authenticated`
-- ownership policies intact (player_can_read_own_account / player_can_update_own_account,
-- `TO authenticated` USING auth.uid() = auth_user_id) — verified live: an authenticated
-- player still sees exactly their own 1 account, not all 3.
drop policy service_role_coaches            on public.coaches;
drop policy service_role_consent_records    on public.consent_records;
drop policy service_role_player_accounts    on public.player_accounts;
drop policy service_role_players            on public.players;
drop policy service_role_progress_metrics   on public.progress_metrics;
drop policy service_role_videos             on public.session_videos;
drop policy service_role_sessions           on public.sessions;
drop policy service_role_training_plans     on public.training_plans;

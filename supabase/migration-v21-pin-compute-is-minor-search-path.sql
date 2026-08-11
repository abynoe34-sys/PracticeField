-- migration-v21-pin-compute-is-minor-search-path.sql
-- Applied to production 2026-08-11 (Supabase migration `pin_compute_is_minor_search_path`).
--
-- compute_is_minor() had a mutable search_path (function-hijacking / CVE-class risk: a
-- caller could shadow a referenced object via a malicious schema on their search_path).
-- This function feeds the minor/consent logic, so correctness here is security-relevant.
-- Pinning search_path clears the Supabase security-advisor lint.
alter function public.compute_is_minor() set search_path = public, pg_temp;

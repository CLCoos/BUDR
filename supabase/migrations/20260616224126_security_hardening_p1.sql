-- P1 sikkerhedshærdning — anvendt på prod 2026-06-16 22:41:26 UTC via Supabase-connector.
-- Verificeret mod koden, så ingen legitime kald brydes.

-- create_audit_log: kun personale (authenticated) + service_role må kalde.
-- Fjern anon/public (forhindrer forfalskning af audit-log).
REVOKE EXECUTE ON FUNCTION public.create_audit_log(text, text, uuid, uuid, text, uuid, jsonb, text) FROM PUBLIC, anon;

-- org_roles_seed_*: ren trigger-funktion, ingen direkte kaldere -> luk helt.
REVOKE EXECUTE ON FUNCTION public.org_roles_seed_defaults_after_org_insert() FROM PUBLIC, anon, authenticated;

-- Fast search_path (forhindrer search_path-injektion i SECURITY DEFINER-funktioner).
-- public + extensions, fordi PIN-funktionerne bruger pgcrypto (crypt/gen_salt).
ALTER FUNCTION public.set_resident_pin(uuid, text) SET search_path = public, extensions;
ALTER FUNCTION public.verify_resident_pin(uuid, text) SET search_path = public, extensions;
ALTER FUNCTION public.award_xp(uuid, text, integer) SET search_path = public, extensions;

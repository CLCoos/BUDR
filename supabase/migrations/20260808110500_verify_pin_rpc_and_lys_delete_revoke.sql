-- Harden leftover PIN oracle RPC + revoke staff hard-DELETE on Lys clinical tables.
--
-- 1) verify_resident_pin is SECURITY DEFINER with no authz / rate limit.
--    Postgres grants EXECUTE to PUBLIC by default, so anon can call it via
--    PostgREST with only the public anon key and brute-force 4-digit PINs.
--    Login already goes through resident-pin-verify (service role + rate limit)
--    and does not use this RPC — revoke client EXECUTE entirely.
--
-- 2) lys_checkin / lys_recovery_profile / lys_reflection / lys_next_steps had
--    authenticated DELETE policies. No Care Portal UI callers; residents delete
--    own next-steps via service-role Route Handlers. Drop policies + REVOKE
--    DELETE so staff JWTs cannot permanently destroy wellbeing history.

BEGIN;

REVOKE ALL ON FUNCTION public.verify_resident_pin(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_resident_pin(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.verify_resident_pin(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_resident_pin(uuid, text) TO service_role;

DROP POLICY IF EXISTS lys_checkin_staff_delete ON public.lys_checkin;
DROP POLICY IF EXISTS lys_recovery_profile_staff_delete ON public.lys_recovery_profile;
DROP POLICY IF EXISTS lys_reflection_staff_delete ON public.lys_reflection;
DROP POLICY IF EXISTS lys_next_steps_staff_delete ON public.lys_next_steps;

REVOKE DELETE ON public.lys_checkin FROM authenticated;
REVOKE DELETE ON public.lys_recovery_profile FROM authenticated;
REVOKE DELETE ON public.lys_reflection FROM authenticated;
REVOKE DELETE ON public.lys_next_steps FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON public.lys_checkin TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lys_recovery_profile TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lys_reflection TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lys_next_steps TO authenticated;

COMMIT;

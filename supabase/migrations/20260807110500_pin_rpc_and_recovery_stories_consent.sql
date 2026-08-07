-- Harden resident PIN RPC + Lys recovery-story consent gate.
--
-- 1) set_resident_pin is SECURITY DEFINER with no authz inside the function.
--    Revoke EXECUTE from PUBLIC / anon / authenticated so only service_role
--    (via resident-pin-set edge function after care_staff + org checks) can call it.
--
-- 2) lys_recovery_stories staff policies allowed SELECT of unapproved rows
--    (including raw_transcript) and unrestricted UPDATE (force-approve without
--    resident consent). Staff may only read approved stories; approve path stays
--    on the Lys service-role API.

BEGIN;

REVOKE ALL ON FUNCTION public.set_resident_pin(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_resident_pin(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.set_resident_pin(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_resident_pin(uuid, text) TO service_role;

DROP POLICY IF EXISTS lys_recovery_stories_staff_select ON public.lys_recovery_stories;
DROP POLICY IF EXISTS lys_recovery_stories_staff_insert ON public.lys_recovery_stories;
DROP POLICY IF EXISTS lys_recovery_stories_staff_update ON public.lys_recovery_stories;
DROP POLICY IF EXISTS lys_recovery_stories_staff_delete ON public.lys_recovery_stories;

CREATE POLICY lys_recovery_stories_staff_select ON public.lys_recovery_stories
  FOR SELECT TO authenticated
  USING (
    resident_approved = true
    AND public.care_staff_can_access_resident((resident_id)::text)
  );

COMMIT;

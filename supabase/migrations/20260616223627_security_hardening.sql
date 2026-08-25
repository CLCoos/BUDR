-- Sikkerhedshærdning — anvendt på prod 2026-06-16 22:36:27 UTC via Supabase-connector.
-- Lukker to fund fra security-advisor + direkte prod-scanning.
-- Begge ændringer er ikke-brydende: legitime kald sker via service-role edge functions.

-- 1) KRITISK: set_resident_pin / verify_resident_pin må IKKE kunne kaldes af
--    anonyme. De kaldes kun af edge functions med service-role.
--    Uden dette kan enhver overskrive en borgers PIN og overtage kontoen.
REVOKE EXECUTE ON FUNCTION public.set_resident_pin(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_resident_pin(uuid, text) FROM PUBLIC, anon, authenticated;
-- service_role (og postgres) beholder adgang automatisk.

-- 2) ERROR: organisations-policy må ikke stole på user_metadata (redigerbart
--    af brugeren). Slå org op via care_staff — samme mønster som øvrige policies.
DROP POLICY IF EXISTS "staff can read own org" ON public.organisations;
CREATE POLICY organisations_staff_select_own_org
  ON public.organisations
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

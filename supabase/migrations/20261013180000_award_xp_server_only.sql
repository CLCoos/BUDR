-- award_xp() er SECURITY DEFINER og tog borger-id og XP-beløb fra klienten, og både
-- anon og authenticated kunne kalde den: enhver kunne give vilkårlig XP til enhver borger.
-- Nu kaldes den kun fra serveren (POST /api/lys/xp med validerede borger-session).
DO $$
BEGIN
  IF to_regprocedure('public.award_xp(uuid, text, integer)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, text, integer) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.award_xp(uuid, text, integer) TO service_role;
  END IF;
END $$;

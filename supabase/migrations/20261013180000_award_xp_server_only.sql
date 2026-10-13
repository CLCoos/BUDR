-- award_xp() er SECURITY DEFINER og tog borger-id og XP-beløb fra klienten, og både
-- anon og authenticated kunne kalde den: enhver kunne give vilkårlig XP til enhver borger.
-- Nu kaldes den kun fra serveren (POST /api/lys/xp med validerede borger-session).
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, text, integer) TO service_role;

-- Personalet kunne hard-slette kliniske data via PostgREST, uden at nogen skærm i
-- portalen gør det: krisealarmer, medicinordinationer og borgerens Lys-trivselsdata
-- (check-ins, recovery-profil, refleksioner, næste skridt). Sletning fjernes for
-- klientroller; service role (serverens API-ruter) er uberørt.
-- Ingen DROP POLICY: uden DELETE-rettighed har de gamle DELETE-policies ingen effekt.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crisis_alerts',
    'resident_medications',
    'lys_checkin',
    'lys_recovery_profile',
    'lys_reflection',
    'lys_next_steps'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE DELETE ON public.%I FROM PUBLIC, anon, authenticated', t);
    END IF;
  END LOOP;
END $$;

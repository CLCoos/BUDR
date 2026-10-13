-- Behovsmedicin (PN) kan gives flere gange samme dag og kræver en begrundelse;
-- effekten kan noteres bagefter. Fast medicin bliver i medication_administrations
-- (én aktiv kvittering pr. ordination pr. dag), som nu afviser PN-ordinationer.
-- Ingen DELETE: en fejlregistrering annulleres (cancelled_at/by).

BEGIN;

CREATE TABLE IF NOT EXISTS public.medication_prn_administrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES public.resident_medications(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  given_at timestamptz NOT NULL DEFAULT now(),
  given_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.care_staff(id),
  reason text NOT NULL,
  effect text,
  effect_noted_at timestamptz,
  effect_noted_by uuid REFERENCES public.care_staff(id),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES public.care_staff(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medication_prn_reason_len CHECK (char_length(btrim(reason)) BETWEEN 1 AND 1000),
  CONSTRAINT medication_prn_effect_len CHECK (effect IS NULL OR char_length(effect) <= 1000),
  CONSTRAINT medication_prn_cancel_pair CHECK ((cancelled_at IS NULL) = (cancelled_by IS NULL))
);

CREATE INDEX IF NOT EXISTS medication_prn_resident_given_idx
  ON public.medication_prn_administrations (resident_id, given_at DESC);
CREATE INDEX IF NOT EXISTS medication_prn_medication_given_idx
  ON public.medication_prn_administrations (medication_id, given_at DESC);

ALTER TABLE public.medication_prn_administrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY medication_prn_staff_select
  ON public.medication_prn_administrations FOR SELECT TO authenticated
  USING (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('view_medications')
  );

CREATE POLICY medication_prn_staff_insert
  ON public.medication_prn_administrations FOR INSERT TO authenticated
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('view_medications')
    AND given_by = auth.uid()
    AND cancelled_at IS NULL
    AND effect IS NULL
    AND given_at BETWEEN now() - interval '5 minutes' AND now() + interval '5 minutes'
    AND org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
    AND EXISTS (
      SELECT 1 FROM public.resident_medications rm
      WHERE rm.id = medication_id
        AND rm.resident_id = medication_prn_administrations.resident_id
        AND rm.time_group = 'behoev'
        AND rm.status = 'aktiv'
    )
  );

-- Effekt og annullering. Triggeren styrer hvilke felter der må ændres og sætter selv
-- effect_noted_by/cancelled_by til den indloggede.
CREATE POLICY medication_prn_staff_update
  ON public.medication_prn_administrations FOR UPDATE TO authenticated
  USING (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('view_medications')
    AND cancelled_at IS NULL
  )
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('view_medications')
  );

CREATE OR REPLACE FUNCTION public.medication_prn_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'cancelled_at' - 'cancelled_by' - 'effect' - 'effect_noted_at' - 'effect_noted_by')
     IS DISTINCT FROM (to_jsonb(OLD) - 'cancelled_at' - 'cancelled_by' - 'effect' - 'effect_noted_at' - 'effect_noted_by') THEN
    RAISE EXCEPTION 'En PN-kvittering kan kun annulleres eller få noteret effekt';
  END IF;
  IF NEW.effect IS DISTINCT FROM OLD.effect THEN
    IF OLD.effect IS NOT NULL THEN
      RAISE EXCEPTION 'Effekten er allerede noteret';
    END IF;
    NEW.effect_noted_at := now();
    NEW.effect_noted_by := auth.uid();
  ELSE
    NEW.effect_noted_at := OLD.effect_noted_at;
    NEW.effect_noted_by := OLD.effect_noted_by;
  END IF;
  IF NEW.cancelled_at IS NOT NULL AND OLD.cancelled_at IS NULL THEN
    NEW.cancelled_at := now();
    NEW.cancelled_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER medication_prn_guard
  BEFORE UPDATE ON public.medication_prn_administrations
  FOR EACH ROW EXECUTE FUNCTION public.medication_prn_guard();

REVOKE ALL ON public.medication_prn_administrations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.medication_prn_administrations TO authenticated;

-- Fast medicin: PN-ordinationer registreres ikke længere som faste kvitteringer.
ALTER POLICY medication_administrations_staff_insert
  ON public.medication_administrations
  WITH CHECK (
    public.care_staff_can_access_resident((resident_id)::text)
    AND public.care_staff_has_permission('view_medications')
    AND given_by = auth.uid()
    AND cancelled_at IS NULL
    AND org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
    AND EXISTS (
      SELECT 1 FROM public.resident_medications rm
      WHERE rm.id = medication_id
        AND rm.resident_id = medication_administrations.resident_id
        AND rm.time_group <> 'behoev'
    )
  );

COMMIT;

-- Medicinudlevering: én kvittering pr. ordination pr. dag (dansk kalenderdato).
-- «Registrér udlevering» (dashboard) og «Giv medicin» (360°) gemte før kun i React-state /
-- localStorage, så en anden medarbejder så dosis som ikke givet (risiko for dobbeltdosis).
--
-- Kvitteringer slettes aldrig. «Fortryd» annullerer (cancelled_at/by), så revisionssporet
-- bevares; en ny kvittering kan derefter registreres. Kun én aktiv kvittering pr. ordination/dag.
-- Kræver care_staff_has_permission() fra 20261013130000_wave1_rls_hardening.sql.
-- Udlevering kræver view_medications (medarbejdere går medicinrunder); write_medications
-- styrer fortsat redigering af selve ordinationerne.

BEGIN;

CREATE TABLE IF NOT EXISTS public.medication_administrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES public.resident_medications(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  scheduled_date date NOT NULL,
  given_at timestamptz NOT NULL DEFAULT now(),
  given_by uuid NOT NULL REFERENCES public.care_staff(id),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES public.care_staff(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medication_administrations_cancel_pair
    CHECK ((cancelled_at IS NULL) = (cancelled_by IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS medication_administrations_active_med_date_uidx
  ON public.medication_administrations (medication_id, scheduled_date)
  WHERE cancelled_at IS NULL;

CREATE INDEX IF NOT EXISTS medication_administrations_resident_date_idx
  ON public.medication_administrations (resident_id, scheduled_date);

ALTER TABLE public.medication_administrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY medication_administrations_staff_select
  ON public.medication_administrations FOR SELECT TO authenticated
  USING (
    public.care_staff_can_access_resident((resident_id)::text)
    AND public.care_staff_has_permission('view_medications')
  );

-- Kun egne kvitteringer, for borgerens egen ordination og org.
CREATE POLICY medication_administrations_staff_insert
  ON public.medication_administrations FOR INSERT TO authenticated
  WITH CHECK (
    public.care_staff_can_access_resident((resident_id)::text)
    AND public.care_staff_has_permission('view_medications')
    AND given_by = auth.uid()
    AND cancelled_at IS NULL
    AND org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
    AND EXISTS (
      SELECT 1 FROM public.resident_medications rm
      WHERE rm.id = medication_id AND rm.resident_id = medication_administrations.resident_id
    )
  );

-- Annullering: kun cancelled_at/cancelled_by må sættes (se trigger), af den der annullerer.
CREATE POLICY medication_administrations_staff_cancel
  ON public.medication_administrations FOR UPDATE TO authenticated
  USING (
    public.care_staff_can_access_resident((resident_id)::text)
    AND public.care_staff_has_permission('view_medications')
    AND cancelled_at IS NULL
  )
  WITH CHECK (cancelled_by = auth.uid());

CREATE OR REPLACE FUNCTION public.medication_administrations_cancel_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'cancelled_at' - 'cancelled_by')
     IS DISTINCT FROM (to_jsonb(OLD) - 'cancelled_at' - 'cancelled_by') THEN
    RAISE EXCEPTION 'En medicinkvittering kan kun annulleres, ikke ændres';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER medication_administrations_cancel_only
  BEFORE UPDATE ON public.medication_administrations
  FOR EACH ROW EXECUTE FUNCTION public.medication_administrations_cancel_only();

GRANT SELECT, INSERT, UPDATE ON public.medication_administrations TO authenticated;
REVOKE DELETE ON public.medication_administrations FROM PUBLIC, anon, authenticated;

COMMIT;

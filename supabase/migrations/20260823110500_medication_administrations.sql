-- Staff medication administrations for a civil day.
-- Dashboard "Registrér udlevering" and 360 "Giv medicin" previously only
-- updated React state / localStorage, so a refresh looked like the dose
-- was never given (double-dose risk).

BEGIN;

CREATE TABLE IF NOT EXISTS public.medication_administrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES public.resident_medications(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id),
  scheduled_date date NOT NULL,
  given_at timestamptz NOT NULL DEFAULT now(),
  given_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS medication_administrations_med_date_uidx
  ON public.medication_administrations (medication_id, scheduled_date);

CREATE INDEX IF NOT EXISTS medication_administrations_resident_date_idx
  ON public.medication_administrations (resident_id, scheduled_date);

ALTER TABLE public.medication_administrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS medication_administrations_staff_select ON public.medication_administrations;
DROP POLICY IF EXISTS medication_administrations_staff_insert ON public.medication_administrations;
DROP POLICY IF EXISTS medication_administrations_staff_delete ON public.medication_administrations;

CREATE POLICY medication_administrations_staff_select
  ON public.medication_administrations FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY medication_administrations_staff_insert
  ON public.medication_administrations FOR INSERT TO authenticated
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY medication_administrations_staff_delete
  ON public.medication_administrations FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

GRANT SELECT, INSERT, DELETE ON public.medication_administrations TO authenticated;

COMMIT;

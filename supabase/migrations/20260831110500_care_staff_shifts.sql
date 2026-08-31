-- Live Care Portal «Vagtplan» + «Løn & timer».
-- Staff så hidtil VagtplanDemoClient / LoenDemoClient med localStorage
-- (`budr_demo_shifts_v1`) og hashed fiktive kolleger (Christian C., Mette R. …)
-- plus lønestimat for «Lars N.». Ingen række i databasen.
-- Org-scopet via care_staff.org_id. Ingen resident-adgang.
-- DELETE kun egen vagt (frameld). Ingen UPDATE.

CREATE TABLE IF NOT EXISTS public.care_staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.care_staff(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  shift_type text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  hours numeric NOT NULL DEFAULT 8,
  location text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_staff_shifts_type_check CHECK (
    shift_type = ANY (ARRAY['dag'::text, 'aften'::text, 'nat'::text])
  ),
  CONSTRAINT care_staff_shifts_hours_check CHECK (hours > 0 AND hours <= 24),
  CONSTRAINT care_staff_shifts_time_check CHECK (
    start_time ~ '^\d{2}:\d{2}$' AND end_time ~ '^\d{2}:\d{2}$'
  ),
  CONSTRAINT care_staff_shifts_location_len CHECK (char_length(location) <= 120),
  CONSTRAINT care_staff_shifts_org_staff_date_type_key UNIQUE (org_id, staff_id, shift_date, shift_type)
);

CREATE INDEX IF NOT EXISTS care_staff_shifts_org_date_idx
  ON public.care_staff_shifts (org_id, shift_date);

CREATE INDEX IF NOT EXISTS care_staff_shifts_staff_date_idx
  ON public.care_staff_shifts (staff_id, shift_date);

ALTER TABLE public.care_staff_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS care_staff_shifts_staff_select_own_org ON public.care_staff_shifts;
CREATE POLICY care_staff_shifts_staff_select_own_org
  ON public.care_staff_shifts
  FOR SELECT
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

DROP POLICY IF EXISTS care_staff_shifts_staff_insert_self ON public.care_staff_shifts;
CREATE POLICY care_staff_shifts_staff_insert_self
  ON public.care_staff_shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND staff_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.care_staff s
      WHERE s.id = staff_id AND s.org_id = care_staff_shifts.org_id
    )
  );

DROP POLICY IF EXISTS care_staff_shifts_staff_delete_self ON public.care_staff_shifts;
CREATE POLICY care_staff_shifts_staff_delete_self
  ON public.care_staff_shifts
  FOR DELETE
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND staff_id = auth.uid()
  );

GRANT SELECT, INSERT, DELETE ON public.care_staff_shifts TO authenticated;
REVOKE UPDATE ON public.care_staff_shifts FROM PUBLIC, anon, authenticated;

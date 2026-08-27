-- Live magtanvendelse / indsatsdokumentation (serviceloven §136 / §141).
-- Staff gemte hidtil kun i browser-localStorage og fik «Gemt ✓».
-- Org-scopet via care_staff.org_id. Ingen DELETE — juridisk spor.

CREATE TABLE IF NOT EXISTS public.care_indsats_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (
    type = ANY (
      ARRAY[
        '§136_fastholdelse'::text,
        '§136_tilbageholdelse'::text,
        '§141_personlig_hygiejne'::text,
        '§141_ernæring'::text,
        '§141_beskyttelse'::text,
        'observation'::text,
        'hændelse'::text
      ]
    )
  ),
  paragraph text NOT NULL DEFAULT '',
  tidspunkt text NOT NULL,
  varighed text NOT NULL DEFAULT '',
  involverede_borgere text NOT NULL DEFAULT '',
  involverede_personale text NOT NULL DEFAULT '',
  beskrivelse text NOT NULL,
  forudgaaende text NOT NULL DEFAULT '',
  handling text NOT NULL DEFAULT '',
  borgerens_reaktion text NOT NULL DEFAULT '',
  opfoelgning text NOT NULL DEFAULT '',
  underskrift text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS care_indsats_records_org_created_idx
  ON public.care_indsats_records (org_id, created_at DESC);

ALTER TABLE public.care_indsats_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS care_indsats_records_staff_select_own_org ON public.care_indsats_records;
CREATE POLICY care_indsats_records_staff_select_own_org
  ON public.care_indsats_records
  FOR SELECT
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

DROP POLICY IF EXISTS care_indsats_records_staff_insert_own_org ON public.care_indsats_records;
CREATE POLICY care_indsats_records_staff_insert_own_org
  ON public.care_indsats_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND (created_by IS NULL OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS care_indsats_records_staff_update_own_org ON public.care_indsats_records;
CREATE POLICY care_indsats_records_staff_update_own_org
  ON public.care_indsats_records
  FOR UPDATE
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  )
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON public.care_indsats_records TO authenticated;
REVOKE DELETE ON public.care_indsats_records FROM PUBLIC, anon, authenticated;

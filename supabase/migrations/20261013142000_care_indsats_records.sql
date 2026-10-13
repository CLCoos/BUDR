-- Magtanvendelse / indsatsdokumentation (serviceloven §136 / §141) gemmes i databasen.
-- Hidtil gemte personalet kun i browserens localStorage og fik «Gemt ✓».
-- Registreringer er et juridisk spor: kun INSERT og SELECT, ingen UPDATE eller DELETE fra klienten.
-- Læsning kræver view_journal, oprettelse write_journal, begge i egen organisation.

BEGIN;

CREATE TABLE IF NOT EXISTS public.care_indsats_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
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
  involverede_borgere text NOT NULL,
  involverede_personale text NOT NULL DEFAULT '',
  beskrivelse text NOT NULL,
  forudgaaende text NOT NULL DEFAULT '',
  handling text NOT NULL DEFAULT '',
  borgerens_reaktion text NOT NULL DEFAULT '',
  opfoelgning text NOT NULL DEFAULT '',
  underskrift text NOT NULL
);

CREATE INDEX IF NOT EXISTS care_indsats_records_org_created_idx
  ON public.care_indsats_records (org_id, created_at DESC);

ALTER TABLE public.care_indsats_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY care_indsats_records_staff_select
  ON public.care_indsats_records
  FOR SELECT TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('view_journal')
  );

CREATE POLICY care_indsats_records_staff_insert
  ON public.care_indsats_records
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND created_by = auth.uid()
    AND public.care_staff_has_permission('write_journal')
  );

REVOKE ALL ON public.care_indsats_records FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.care_indsats_records TO authenticated;

COMMIT;

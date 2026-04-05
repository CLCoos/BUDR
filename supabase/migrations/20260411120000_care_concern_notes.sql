-- Bekymringsnotater (portal): hurtige observationer, adskilt fra journal_godkendt workflow.

CREATE TABLE IF NOT EXISTS public.care_concern_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id text NOT NULL,
  note text NOT NULL CHECK (char_length(note) <= 2000),
  category text NOT NULL,
  severity smallint NOT NULL CHECK (severity >= 1 AND severity <= 10),
  staff_name text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS care_concern_notes_resident_created_idx
  ON public.care_concern_notes (resident_id, created_at DESC);

ALTER TABLE public.care_concern_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ccn_staff_select_org" ON public.care_concern_notes;
DROP POLICY IF EXISTS "ccn_staff_insert_org" ON public.care_concern_notes;
DROP POLICY IF EXISTS "ccn_staff_delete_org" ON public.care_concern_notes;

CREATE POLICY "ccn_staff_select_org"
  ON public.care_concern_notes
  FOR SELECT
  TO authenticated
  USING (
    care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = care_concern_notes.resident_id::text
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (care_visible_facility_ids())
    )
  );

CREATE POLICY "ccn_staff_insert_org"
  ON public.care_concern_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = care_concern_notes.resident_id::text
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (care_visible_facility_ids())
    )
  );

CREATE POLICY "ccn_staff_delete_org"
  ON public.care_concern_notes
  FOR DELETE
  TO authenticated
  USING (
    care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = care_concern_notes.resident_id::text
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (care_visible_facility_ids())
    )
  );

GRANT SELECT, INSERT, DELETE ON public.care_concern_notes TO authenticated;

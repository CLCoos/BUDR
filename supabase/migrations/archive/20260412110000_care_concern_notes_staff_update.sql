-- Staff kan rette egne bekymringsnotater (samme org-check som SELECT/INSERT/DELETE).
-- App bruger pt. kun insert/delete; UPDATE gør RLS komplet og klar til fremtidig redigering.

DROP POLICY IF EXISTS "ccn_staff_update_org" ON public.care_concern_notes;

CREATE POLICY "ccn_staff_update_org"
  ON public.care_concern_notes
  FOR UPDATE
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
  )
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

GRANT UPDATE ON public.care_concern_notes TO authenticated;

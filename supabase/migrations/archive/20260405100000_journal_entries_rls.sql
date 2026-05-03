-- RLS: journal_entries kun for personale i samme organisation som beboeren.
-- Kræver care_is_portal_staff() + care_visible_facility_ids() (20260331140000_add_audit_logs.sql).
-- Service role (API routes, server fetch med service key) bypasser RLS som sædvanligt.

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_staff_select_org" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_staff_insert_org" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_staff_update_org" ON public.journal_entries;

-- Beboer-rækker matches journal via user_id (samme værdi som journal_entries.resident_id)
CREATE POLICY "journal_staff_select_org"
  ON public.journal_entries
  FOR SELECT
  TO authenticated
  USING (
    care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = journal_entries.resident_id::text
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (care_visible_facility_ids())
    )
  );

CREATE POLICY "journal_staff_insert_org"
  ON public.journal_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = journal_entries.resident_id::text
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (care_visible_facility_ids())
    )
  );

CREATE POLICY "journal_staff_update_org"
  ON public.journal_entries
  FOR UPDATE
  TO authenticated
  USING (
    care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = journal_entries.resident_id::text
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (care_visible_facility_ids())
    )
  )
  WITH CHECK (
    care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = journal_entries.resident_id::text
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (care_visible_facility_ids())
    )
  );

-- Tydelige rettigheder til portal-klienten (anon har ingen policies her)
GRANT SELECT, INSERT, UPDATE ON public.journal_entries TO authenticated;

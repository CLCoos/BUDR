-- Remove legacy permissive RLS policies that were captured in the baseline dump.
-- RLS policies are OR'ed together, so these broad policies bypass the stricter
-- org/resident-scoped policies created by later migrations.

-- Journal entries are clinical records. Scope all staff access through the
-- resident's organisation instead of trusting client-supplied org_id alone.
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can insert journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Staff can read journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "staff_journal_org" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_staff_select_org" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_staff_insert_org" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_staff_update_org" ON public.journal_entries;

CREATE POLICY "journal_staff_select_org"
  ON public.journal_entries
  FOR SELECT
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = journal_entries.resident_id::text
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (public.care_visible_facility_ids())
    )
  );

CREATE POLICY "journal_staff_insert_org"
  ON public.journal_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = journal_entries.resident_id::text
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (public.care_visible_facility_ids())
    )
  );

CREATE POLICY "journal_staff_update_org"
  ON public.journal_entries
  FOR UPDATE
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = journal_entries.resident_id::text
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (public.care_visible_facility_ids())
    )
  )
  WITH CHECK (
    public.care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = journal_entries.resident_id::text
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (public.care_visible_facility_ids())
    )
  );

-- Medication rows are read in the portal, but legacy policies allowed every
-- authenticated client to read/write every medication row.
ALTER TABLE public.resident_medications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert medications" ON public.resident_medications;
DROP POLICY IF EXISTS "Authenticated users can read medications" ON public.resident_medications;
DROP POLICY IF EXISTS "Authenticated users can update medications" ON public.resident_medications;
DROP POLICY IF EXISTS "staff_medications_org" ON public.resident_medications;
DROP POLICY IF EXISTS "rm_staff_select" ON public.resident_medications;

CREATE POLICY "rm_staff_select"
  ON public.resident_medications
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

-- Notifications should only be visible/acknowledgeable for residents the staff
-- member may access.
ALTER TABLE public.care_portal_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read notifications" ON public.care_portal_notifications;
DROP POLICY IF EXISTS "staff acknowledge notifications" ON public.care_portal_notifications;
DROP POLICY IF EXISTS "staff_notifications_org" ON public.care_portal_notifications;
DROP POLICY IF EXISTS "cpn_staff_select_org" ON public.care_portal_notifications;
DROP POLICY IF EXISTS "cpn_staff_update_org" ON public.care_portal_notifications;

CREATE POLICY "cpn_staff_select_org"
  ON public.care_portal_notifications
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "cpn_staff_update_org"
  ON public.care_portal_notifications
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

-- Facility contacts are editable from portal settings and visible to residents
-- in the same organisation. Remove the legacy all-org staff policy.
ALTER TABLE public.facility_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_facility_contacts" ON public.facility_contacts;

-- HOTFIX: Drop åbne USING(true)-policies og dublerede ALL/public-policies
-- på 7 tabeller. Granulære policies findes allerede for de fleste.
-- Portal-tabeller får nye policies.

BEGIN;

-- =====================================================================
-- 1) journal_entries — har staff_journal_org (org-scoped) allerede.
--    Drop 2 åbne policies + 1 dubleret ALL/public.
-- =====================================================================
DROP POLICY IF EXISTS "Staff can insert journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Staff can read journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS staff_journal_org ON public.journal_entries;

CREATE POLICY journal_entries_staff_select_own_org
  ON public.journal_entries FOR SELECT TO authenticated
  USING (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

CREATE POLICY journal_entries_staff_insert_own_org
  ON public.journal_entries FOR INSERT TO authenticated
  WITH CHECK (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

CREATE POLICY journal_entries_staff_update_own_org
  ON public.journal_entries FOR UPDATE TO authenticated
  USING (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()))
  WITH CHECK (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

CREATE POLICY journal_entries_staff_delete_own_org
  ON public.journal_entries FOR DELETE TO authenticated
  USING (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

-- =====================================================================
-- 2) resident_medications — drop 3 åbne + dubleret ALL/public.
--    Erstat med granulære.
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can insert medications" ON public.resident_medications;
DROP POLICY IF EXISTS "Authenticated users can read medications" ON public.resident_medications;
DROP POLICY IF EXISTS "Authenticated users can update medications" ON public.resident_medications;
DROP POLICY IF EXISTS staff_medications_org ON public.resident_medications;

CREATE POLICY resident_medications_staff_select_own_org
  ON public.resident_medications FOR SELECT TO authenticated
  USING (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

CREATE POLICY resident_medications_staff_insert_own_org
  ON public.resident_medications FOR INSERT TO authenticated
  WITH CHECK (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

CREATE POLICY resident_medications_staff_update_own_org
  ON public.resident_medications FOR UPDATE TO authenticated
  USING (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()))
  WITH CHECK (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

CREATE POLICY resident_medications_staff_delete_own_org
  ON public.resident_medications FOR DELETE TO authenticated
  USING (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

CREATE POLICY resident_medications_resident_select_self
  ON public.resident_medications FOR SELECT TO authenticated
  USING (resident_id = auth.uid());

-- =====================================================================
-- 3) care_portal_notifications — cpn_staff_*_org findes allerede.
--    Drop 2 åbne + dubleret ALL/public.
-- =====================================================================
DROP POLICY IF EXISTS "staff acknowledge notifications" ON public.care_portal_notifications;
DROP POLICY IF EXISTS "staff read notifications" ON public.care_portal_notifications;
DROP POLICY IF EXISTS staff_notifications_org ON public.care_portal_notifications;
-- "service insert notifications" beholdes (service_role + WITH CHECK true er OK)

-- =====================================================================
-- 4) facility_contacts — fc_staff_* + fc_resident_select findes.
--    Drop anon-read og dubleret ALL/true.
-- =====================================================================
DROP POLICY IF EXISTS anon_read_facility_contacts ON public.facility_contacts;
DROP POLICY IF EXISTS staff_all_facility_contacts ON public.facility_contacts;

-- =====================================================================
-- 5) garden_plots — gp_* findes allerede.
--    Drop anon_all_plots (KRITISK — anonyme havde fuld adgang).
--    service_all_plots beholdes.
-- =====================================================================
DROP POLICY IF EXISTS anon_all_plots ON public.garden_plots;

-- =====================================================================
-- 6) portal_message_threads — har KUN åbne policies. Byg fra bunden.
--    org_id er text, så vi caster care_staff.org_id::text.
-- =====================================================================
DROP POLICY IF EXISTS "portal insert threads" ON public.portal_message_threads;
DROP POLICY IF EXISTS "portal read threads" ON public.portal_message_threads;

CREATE POLICY portal_threads_staff_select_own_org
  ON public.portal_message_threads FOR SELECT TO authenticated
  USING (org_id = (SELECT cs.org_id::text FROM public.care_staff cs WHERE cs.id = auth.uid()));

CREATE POLICY portal_threads_staff_insert_own_org
  ON public.portal_message_threads FOR INSERT TO authenticated
  WITH CHECK (
    org_id = (SELECT cs.org_id::text FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY portal_threads_staff_update_own_org
  ON public.portal_message_threads FOR UPDATE TO authenticated
  USING (org_id = (SELECT cs.org_id::text FROM public.care_staff cs WHERE cs.id = auth.uid()))
  WITH CHECK (org_id = (SELECT cs.org_id::text FROM public.care_staff cs WHERE cs.id = auth.uid()));

CREATE POLICY portal_threads_staff_delete_own_org
  ON public.portal_message_threads FOR DELETE TO authenticated
  USING (org_id = (SELECT cs.org_id::text FROM public.care_staff cs WHERE cs.id = auth.uid()));

-- =====================================================================
-- 7) portal_messages — samme mønster.
-- =====================================================================
DROP POLICY IF EXISTS "portal insert messages" ON public.portal_messages;
DROP POLICY IF EXISTS "portal read messages" ON public.portal_messages;

CREATE POLICY portal_messages_staff_select_own_org
  ON public.portal_messages FOR SELECT TO authenticated
  USING (org_id = (SELECT cs.org_id::text FROM public.care_staff cs WHERE cs.id = auth.uid()));

CREATE POLICY portal_messages_staff_insert_own_org
  ON public.portal_messages FOR INSERT TO authenticated
  WITH CHECK (
    org_id = (SELECT cs.org_id::text FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND sender_id = auth.uid()
  );

CREATE POLICY portal_messages_staff_update_own_org
  ON public.portal_messages FOR UPDATE TO authenticated
  USING (org_id = (SELECT cs.org_id::text FROM public.care_staff cs WHERE cs.id = auth.uid()))
  WITH CHECK (org_id = (SELECT cs.org_id::text FROM public.care_staff cs WHERE cs.id = auth.uid()));

CREATE POLICY portal_messages_staff_delete_own_org
  ON public.portal_messages FOR DELETE TO authenticated
  USING (org_id = (SELECT cs.org_id::text FROM public.care_staff cs WHERE cs.id = auth.uid()));

COMMIT;

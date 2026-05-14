-- Lock down legacy permissive policies carried into the squashed baseline.
-- These policy names existed in early/manual schemas and are permissive OR-branches
-- alongside the newer org-scoped policies, so they must be removed explicitly.

DROP POLICY IF EXISTS "Authenticated users can insert medications" ON public.resident_medications;
DROP POLICY IF EXISTS "Authenticated users can read medications" ON public.resident_medications;
DROP POLICY IF EXISTS "Authenticated users can update medications" ON public.resident_medications;
DROP POLICY IF EXISTS "Staff can insert journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Staff can read journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Staff manage plans" ON public.daily_plans;
DROP POLICY IF EXISTS "Staff review proposals" ON public.plan_proposals;
DROP POLICY IF EXISTS "Staff see org plans" ON public.daily_plans;
DROP POLICY IF EXISTS "Staff see org proposals" ON public.plan_proposals;
DROP POLICY IF EXISTS anon_all_plots ON public.garden_plots;
DROP POLICY IF EXISTS anon_read_facility_contacts ON public.facility_contacts;
DROP POLICY IF EXISTS open_select ON public.care_residents;
DROP POLICY IF EXISTS "portal can read all checkins" ON public.park_daily_checkin;
DROP POLICY IF EXISTS "residents can insert own checkins" ON public.park_daily_checkin;
DROP POLICY IF EXISTS "portal insert messages" ON public.portal_messages;
DROP POLICY IF EXISTS "portal insert threads" ON public.portal_message_threads;
DROP POLICY IF EXISTS "portal read messages" ON public.portal_messages;
DROP POLICY IF EXISTS "portal read threads" ON public.portal_message_threads;
DROP POLICY IF EXISTS "staff acknowledge notifications" ON public.care_portal_notifications;
DROP POLICY IF EXISTS "staff read notifications" ON public.care_portal_notifications;
DROP POLICY IF EXISTS staff_all_facility_contacts ON public.facility_contacts;
DROP POLICY IF EXISTS staff_suggest_plan_items ON public.resident_plan_items;

DROP POLICY IF EXISTS care_residents_staff_select ON public.care_residents;
DROP POLICY IF EXISTS care_residents_self_select ON public.care_residents;
DROP POLICY IF EXISTS care_residents_self_update ON public.care_residents;
DROP POLICY IF EXISTS journal_staff_select_org ON public.journal_entries;
DROP POLICY IF EXISTS journal_staff_insert_org ON public.journal_entries;
DROP POLICY IF EXISTS journal_staff_update_org ON public.journal_entries;
DROP POLICY IF EXISTS dp_staff_select ON public.daily_plans;
DROP POLICY IF EXISTS dp_staff_insert ON public.daily_plans;
DROP POLICY IF EXISTS dp_staff_update ON public.daily_plans;
DROP POLICY IF EXISTS dp_staff_delete ON public.daily_plans;
DROP POLICY IF EXISTS pp_staff_select ON public.plan_proposals;
DROP POLICY IF EXISTS pp_staff_insert ON public.plan_proposals;
DROP POLICY IF EXISTS pp_staff_update ON public.plan_proposals;
DROP POLICY IF EXISTS pp_staff_delete ON public.plan_proposals;
DROP POLICY IF EXISTS rm_staff_select ON public.resident_medications;
DROP POLICY IF EXISTS pdc_staff_select ON public.park_daily_checkin;
DROP POLICY IF EXISTS portal_threads_staff_select ON public.portal_message_threads;
DROP POLICY IF EXISTS portal_threads_staff_insert ON public.portal_message_threads;
DROP POLICY IF EXISTS portal_threads_staff_update ON public.portal_message_threads;
DROP POLICY IF EXISTS portal_messages_staff_select ON public.portal_messages;
DROP POLICY IF EXISTS portal_messages_staff_insert ON public.portal_messages;

CREATE POLICY care_residents_staff_select
  ON public.care_residents
  FOR SELECT
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id IS NOT NULL
    AND org_id = ANY (public.care_visible_facility_ids())
  );

CREATE POLICY care_residents_self_select
  ON public.care_residents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY care_residents_self_update
  ON public.care_residents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY journal_staff_select_org
  ON public.journal_entries
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY journal_staff_insert_org
  ON public.journal_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY journal_staff_update_org
  ON public.journal_entries
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY dp_staff_select
  ON public.daily_plans
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY dp_staff_insert
  ON public.daily_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY dp_staff_update
  ON public.daily_plans
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY dp_staff_delete
  ON public.daily_plans
  FOR DELETE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY pp_staff_select
  ON public.plan_proposals
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY pp_staff_insert
  ON public.plan_proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY pp_staff_update
  ON public.plan_proposals
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY pp_staff_delete
  ON public.plan_proposals
  FOR DELETE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY rm_staff_select
  ON public.resident_medications
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY pdc_staff_select
  ON public.park_daily_checkin
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id));

CREATE POLICY portal_threads_staff_select
  ON public.portal_message_threads
  FOR SELECT
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id IN (SELECT unnest(public.care_visible_facility_ids())::text)
  );

CREATE POLICY portal_threads_staff_insert
  ON public.portal_message_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id IN (SELECT unnest(public.care_visible_facility_ids())::text)
  );

CREATE POLICY portal_threads_staff_update
  ON public.portal_message_threads
  FOR UPDATE
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id IN (SELECT unnest(public.care_visible_facility_ids())::text)
  )
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id IN (SELECT unnest(public.care_visible_facility_ids())::text)
  );

CREATE POLICY portal_messages_staff_select
  ON public.portal_messages
  FOR SELECT
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id IN (SELECT unnest(public.care_visible_facility_ids())::text)
  );

CREATE POLICY portal_messages_staff_insert
  ON public.portal_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id IN (SELECT unnest(public.care_visible_facility_ids())::text)
    AND EXISTS (
      SELECT 1
      FROM public.portal_message_threads t
      WHERE t.id = portal_messages.thread_id
        AND t.org_id = portal_messages.org_id
        AND t.org_id IN (SELECT unnest(public.care_visible_facility_ids())::text)
    )
  );

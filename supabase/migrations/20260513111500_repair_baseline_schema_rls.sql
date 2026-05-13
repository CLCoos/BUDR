-- Repair the squashed baseline so fresh and already-migrated databases keep
-- the journal/CMS schema and tenant RLS guarantees expected by the app.

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS journal_status text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

UPDATE public.journal_entries
SET journal_status = 'godkendt'
WHERE journal_status IS NULL
   OR journal_status NOT IN ('kladde', 'godkendt');

ALTER TABLE public.journal_entries
  ALTER COLUMN journal_status SET DEFAULT 'godkendt',
  ALTER COLUMN journal_status SET NOT NULL;

ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_journal_status_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_journal_status_check
  CHECK (journal_status IN ('kladde', 'godkendt'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'journal_entries_approved_by_fkey'
      AND conrelid = 'public.journal_entries'::regclass
  ) THEN
    ALTER TABLE public.journal_entries
      ADD CONSTRAINT journal_entries_approved_by_fkey
      FOREIGN KEY (approved_by) REFERENCES auth.users (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_journal_entries_resident_status_created
  ON public.journal_entries (resident_id, journal_status, created_at DESC);

DO $$
BEGIN
  IF to_regclass('public.marketing_content_blocks') IS NOT NULL THEN
    ALTER TABLE public.marketing_content_blocks
      ADD COLUMN IF NOT EXISTS revisions jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END
$$;

-- Remove policies from the dumped baseline that make tenant-scoped policies moot.
DROP POLICY IF EXISTS "Authenticated users can insert medications" ON public.resident_medications;
DROP POLICY IF EXISTS "Authenticated users can read medications" ON public.resident_medications;
DROP POLICY IF EXISTS "Authenticated users can update medications" ON public.resident_medications;
DROP POLICY IF EXISTS "Staff can insert journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Staff can read journal entries" ON public.journal_entries;
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

ALTER TABLE public.care_residents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS care_residents_staff_select ON public.care_residents;
DROP POLICY IF EXISTS care_residents_self_select ON public.care_residents;
DROP POLICY IF EXISTS care_residents_self_update ON public.care_residents;

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

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS journal_staff_select_org ON public.journal_entries;
DROP POLICY IF EXISTS journal_staff_insert_org ON public.journal_entries;
DROP POLICY IF EXISTS journal_staff_update_org ON public.journal_entries;

CREATE POLICY journal_staff_select_org
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

CREATE POLICY journal_staff_insert_org
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

CREATE POLICY journal_staff_update_org
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

ALTER TABLE public.park_daily_checkin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pdc_staff_select ON public.park_daily_checkin;
DROP POLICY IF EXISTS pdc_resident_insert ON public.park_daily_checkin;

CREATE POLICY pdc_staff_select
  ON public.park_daily_checkin
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY pdc_resident_insert
  ON public.park_daily_checkin
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = resident_id::text);

ALTER TABLE public.portal_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portal_threads_select_own_org ON public.portal_message_threads;
DROP POLICY IF EXISTS portal_threads_insert_own_org ON public.portal_message_threads;
DROP POLICY IF EXISTS portal_threads_update_own_org ON public.portal_message_threads;
DROP POLICY IF EXISTS portal_messages_select_own_org ON public.portal_messages;
DROP POLICY IF EXISTS portal_messages_insert_own_org ON public.portal_messages;

CREATE POLICY portal_threads_select_own_org
  ON public.portal_message_threads
  FOR SELECT
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id::uuid = ANY (public.care_visible_facility_ids())
  );

CREATE POLICY portal_threads_insert_own_org
  ON public.portal_message_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id::uuid = ANY (public.care_visible_facility_ids())
  );

CREATE POLICY portal_threads_update_own_org
  ON public.portal_message_threads
  FOR UPDATE
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id::uuid = ANY (public.care_visible_facility_ids())
  )
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id::uuid = ANY (public.care_visible_facility_ids())
  );

CREATE POLICY portal_messages_select_own_org
  ON public.portal_messages
  FOR SELECT
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id::uuid = ANY (public.care_visible_facility_ids())
  );

CREATE POLICY portal_messages_insert_own_org
  ON public.portal_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id::uuid = ANY (public.care_visible_facility_ids())
    AND EXISTS (
      SELECT 1
      FROM public.portal_message_threads t
      WHERE t.id = portal_messages.thread_id
        AND t.org_id = portal_messages.org_id
    )
  );

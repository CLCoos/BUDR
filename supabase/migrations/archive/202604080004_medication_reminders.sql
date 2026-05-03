-- Migration: Opretter medication_reminders til borger-specifikke medicinpåmindelser.
-- Afhængigheder: public.care_residents, public.care_staff_can_access_resident(text), auth.users.
-- Mapping (prompt -> faktisk repo):
--   residents     -> public.care_residents
--   check_ins     -> public.park_daily_checkin
--   care_alerts   -> public.care_portal_notifications
--   care_staff    -> ingen dedikeret public.care_staff tabel fundet i repo-migrations (staff er auth.users + org claims)
--   audit_logs    -> public.audit_logs
-- Nye tabeller i prompten:
--   crisis_plans          -> ingen eksisterende direkte tabel fundet i repo-migrations
--   crisis_alerts         -> ingen eksisterende direkte tabel fundet i repo-migrations
--   medication_reminders  -> ingen eksisterende direkte tabel fundet i repo-migrations
--   on_call_staff         -> ingen eksisterende direkte tabel fundet i repo-migrations

CREATE TABLE IF NOT EXISTS public.medication_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL,
  scheduled_time time NOT NULL,
  label text NOT NULL,
  taken_at timestamptz,
  date date NOT NULL DEFAULT current_date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medication_reminders_resident_date_idx
  ON public.medication_reminders (resident_id, date, scheduled_time);

CREATE INDEX IF NOT EXISTS medication_reminders_open_idx
  ON public.medication_reminders (resident_id, date)
  WHERE taken_at IS NULL;

DO $$
BEGIN
  IF to_regclass('public.medication_reminders') IS NOT NULL THEN
    ALTER TABLE public.medication_reminders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "medication_reminders_staff_select" ON public.medication_reminders;
DROP POLICY IF EXISTS "medication_reminders_staff_insert" ON public.medication_reminders;
DROP POLICY IF EXISTS "medication_reminders_staff_update" ON public.medication_reminders;
DROP POLICY IF EXISTS "medication_reminders_staff_delete" ON public.medication_reminders;
DROP POLICY IF EXISTS "medication_reminders_resident_select_self" ON public.medication_reminders;
DROP POLICY IF EXISTS "medication_reminders_resident_update_taken_at" ON public.medication_reminders;

CREATE POLICY "medication_reminders_staff_select"
  ON public.medication_reminders
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "medication_reminders_staff_insert"
  ON public.medication_reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "medication_reminders_staff_update"
  ON public.medication_reminders
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "medication_reminders_staff_delete"
  ON public.medication_reminders
  FOR DELETE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "medication_reminders_resident_select_self"
  ON public.medication_reminders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = resident_id);

CREATE POLICY "medication_reminders_resident_update_taken_at"
  ON public.medication_reminders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = resident_id)
  WITH CHECK (auth.uid() = resident_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_reminders TO authenticated;

-- Rollback (manual):
-- DROP TABLE IF EXISTS public.medication_reminders;

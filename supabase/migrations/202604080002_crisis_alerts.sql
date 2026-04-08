-- Migration: Opretter crisis_alerts til realtime alarmflow mellem Lys-app og Care Portal.
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

CREATE TABLE IF NOT EXISTS public.crisis_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  trin integer NOT NULL CHECK (trin BETWEEN 1 AND 5),
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS crisis_alerts_unresolved_idx
  ON public.crisis_alerts (status, triggered_at DESC);

CREATE INDEX IF NOT EXISTS crisis_alerts_resident_idx
  ON public.crisis_alerts (resident_id, triggered_at DESC);

DO $$
BEGIN
  IF to_regclass('public.crisis_alerts') IS NOT NULL THEN
    ALTER TABLE public.crisis_alerts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "crisis_alerts_staff_select" ON public.crisis_alerts;
DROP POLICY IF EXISTS "crisis_alerts_staff_insert" ON public.crisis_alerts;
DROP POLICY IF EXISTS "crisis_alerts_staff_update" ON public.crisis_alerts;
DROP POLICY IF EXISTS "crisis_alerts_staff_delete" ON public.crisis_alerts;
DROP POLICY IF EXISTS "crisis_alerts_resident_select_self" ON public.crisis_alerts;
DROP POLICY IF EXISTS "crisis_alerts_resident_insert_self" ON public.crisis_alerts;

CREATE POLICY "crisis_alerts_staff_select"
  ON public.crisis_alerts
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "crisis_alerts_staff_insert"
  ON public.crisis_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "crisis_alerts_staff_update"
  ON public.crisis_alerts
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "crisis_alerts_staff_delete"
  ON public.crisis_alerts
  FOR DELETE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "crisis_alerts_resident_select_self"
  ON public.crisis_alerts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = resident_id);

CREATE POLICY "crisis_alerts_resident_insert_self"
  ON public.crisis_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = resident_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crisis_alerts TO authenticated;

-- Rollback (manual):
-- DROP TABLE IF EXISTS public.crisis_alerts;

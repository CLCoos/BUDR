-- Migration: Opretter crisis_plans (eller genbruger eksisterende navn hvis allerede oprettet).
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

CREATE TABLE IF NOT EXISTS public.crisis_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL,
  warning_signs text[] NOT NULL DEFAULT '{}'::text[],
  helpful_strategies text[] NOT NULL DEFAULT '{}'::text[],
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS crisis_plans_resident_unique_idx
  ON public.crisis_plans (resident_id);

CREATE INDEX IF NOT EXISTS crisis_plans_updated_at_idx
  ON public.crisis_plans (updated_at DESC);

DO $$
BEGIN
  IF to_regclass('public.crisis_plans') IS NOT NULL THEN
    ALTER TABLE public.crisis_plans ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "crisis_plans_staff_select" ON public.crisis_plans;
DROP POLICY IF EXISTS "crisis_plans_staff_insert" ON public.crisis_plans;
DROP POLICY IF EXISTS "crisis_plans_staff_update" ON public.crisis_plans;
DROP POLICY IF EXISTS "crisis_plans_staff_delete" ON public.crisis_plans;
DROP POLICY IF EXISTS "crisis_plans_resident_select_self" ON public.crisis_plans;

CREATE POLICY "crisis_plans_staff_select"
  ON public.crisis_plans
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "crisis_plans_staff_insert"
  ON public.crisis_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "crisis_plans_staff_update"
  ON public.crisis_plans
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "crisis_plans_staff_delete"
  ON public.crisis_plans
  FOR DELETE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "crisis_plans_resident_select_self"
  ON public.crisis_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = resident_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crisis_plans TO authenticated;

-- Rollback (manual):
-- DROP TABLE IF EXISTS public.crisis_plans;

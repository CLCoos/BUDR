-- Migration: Opretter on_call_staff til vagthavende kontakt pr. dato/skift.
-- Afhængigheder: public.organisations, auth.users.
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
-- Bemærk: promptens "house_id" mappes her til "org_id" (organisation/facility i dette repo).

CREATE TABLE IF NOT EXISTS public.on_call_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL,
  phone text NOT NULL,
  date date NOT NULL DEFAULT current_date,
  shift text NOT NULL CHECK (shift IN ('day', 'evening', 'night')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS on_call_staff_org_date_shift_unique_idx
  ON public.on_call_staff (org_id, date, shift);

CREATE INDEX IF NOT EXISTS on_call_staff_lookup_idx
  ON public.on_call_staff (org_id, date, shift, created_at DESC);

DO $$
BEGIN
  IF to_regclass('public.on_call_staff') IS NOT NULL THEN
    ALTER TABLE public.on_call_staff ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "on_call_staff_staff_select_own_org" ON public.on_call_staff;
DROP POLICY IF EXISTS "on_call_staff_staff_insert_own_org" ON public.on_call_staff;
DROP POLICY IF EXISTS "on_call_staff_staff_update_own_org" ON public.on_call_staff;
DROP POLICY IF EXISTS "on_call_staff_staff_delete_own_org" ON public.on_call_staff;
DROP POLICY IF EXISTS "on_call_staff_resident_select_own_org" ON public.on_call_staff;

CREATE POLICY "on_call_staff_staff_select_own_org"
  ON public.on_call_staff
  FOR SELECT
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id = ANY (public.care_visible_facility_ids())
  );

CREATE POLICY "on_call_staff_staff_insert_own_org"
  ON public.on_call_staff
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id = ANY (public.care_visible_facility_ids())
  );

CREATE POLICY "on_call_staff_staff_update_own_org"
  ON public.on_call_staff
  FOR UPDATE
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id = ANY (public.care_visible_facility_ids())
  )
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id = ANY (public.care_visible_facility_ids())
  );

CREATE POLICY "on_call_staff_staff_delete_own_org"
  ON public.on_call_staff
  FOR DELETE
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id = ANY (public.care_visible_facility_ids())
  );

CREATE POLICY "on_call_staff_resident_select_own_org"
  ON public.on_call_staff
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id = auth.uid()
        AND cr.org_id = on_call_staff.org_id
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.on_call_staff TO authenticated;

-- Rollback (manual):
-- DROP TABLE IF EXISTS public.on_call_staff;

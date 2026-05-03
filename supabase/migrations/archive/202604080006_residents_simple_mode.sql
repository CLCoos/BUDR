-- Migration: Udvider care_residents med simple_mode for forenklet app-visning.
-- Afhængigheder: public.care_residents.
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

ALTER TABLE IF EXISTS public.care_residents
  ADD COLUMN IF NOT EXISTS simple_mode boolean NOT NULL DEFAULT false;

-- Rollback (manual):
-- ALTER TABLE public.care_residents DROP COLUMN IF EXISTS simple_mode;

-- Migration: Udvider park_daily_checkin med voice_transcript og ai_summary.
-- Afhængigheder: public.park_daily_checkin.
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

ALTER TABLE IF EXISTS public.park_daily_checkin
  ADD COLUMN IF NOT EXISTS voice_transcript text,
  ADD COLUMN IF NOT EXISTS ai_summary text;

-- Rollback (manual):
-- ALTER TABLE public.park_daily_checkin DROP COLUMN IF EXISTS voice_transcript;
-- ALTER TABLE public.park_daily_checkin DROP COLUMN IF EXISTS ai_summary;

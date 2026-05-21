-- Migration: Compatibility view park_daily_checkin → lys_checkin
-- Formål: Lader gammel kode læse fra park_daily_checkin uden ændringer
-- Køres EFTER lys_recovery_schema (som dropper park_daily_checkin-tabellen)
-- INSERTs er i mellemtiden migreret til /api/lys/daily-checkin i koden

BEGIN;

ALTER TABLE public.lys_checkin
  ADD COLUMN IF NOT EXISTS checkin_type text NOT NULL DEFAULT 'daily';

DROP VIEW IF EXISTS public.park_daily_checkin CASCADE;

CREATE VIEW public.park_daily_checkin AS
SELECT
  id,
  resident_id,
  org_id,
  mood_score,
  mood_label,
  traffic_light,
  free_text AS note,
  voice_transcript,
  ai_summary,
  created_at
FROM public.lys_checkin
WHERE checkin_type = 'daily';

ALTER VIEW public.park_daily_checkin SET (security_invoker = on);

GRANT SELECT ON public.park_daily_checkin TO authenticated, anon, service_role;

COMMIT;

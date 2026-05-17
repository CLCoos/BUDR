-- Tilføj checkin_type til lys_checkin (daily vs weekly).
-- Kør før demo_recovery_seed.sql og før park_daily_checkin-compat-view.

ALTER TABLE public.lys_checkin
  ADD COLUMN IF NOT EXISTS checkin_type text NOT NULL DEFAULT 'daily';

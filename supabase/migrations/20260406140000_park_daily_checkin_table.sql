-- park_daily_checkin: opret tabel hvis den mangler (fx ældre projekter) + RLS.
-- Matcher felter fra API, morgencheck-in, Lys/dataService og park-queries.

CREATE TABLE IF NOT EXISTS public.park_daily_checkin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id text NOT NULL,
  mood_score integer,
  traffic_light text,
  note text,
  score integer,
  mood_label text,
  free_text text,
  check_in_date date,
  energy_level integer,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS park_daily_checkin_resident_created_idx
  ON public.park_daily_checkin (resident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS park_daily_checkin_resident_check_in_date_idx
  ON public.park_daily_checkin (resident_id, check_in_date);

ALTER TABLE public.park_daily_checkin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pdc_staff_select" ON public.park_daily_checkin;
DROP POLICY IF EXISTS "pdc_resident_select_self" ON public.park_daily_checkin;
DROP POLICY IF EXISTS "pdc_resident_insert_self" ON public.park_daily_checkin;

CREATE POLICY "pdc_staff_select"
  ON public.park_daily_checkin
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id));

CREATE POLICY "pdc_resident_select_self"
  ON public.park_daily_checkin
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = resident_id);

CREATE POLICY "pdc_resident_insert_self"
  ON public.park_daily_checkin
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = resident_id);

GRANT SELECT, INSERT ON public.park_daily_checkin TO authenticated;

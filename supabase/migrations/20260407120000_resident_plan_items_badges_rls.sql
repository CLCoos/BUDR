-- Plan-fanen: resident_plan_items + resident_badges (opret hvis mangler, RLS som øvrig org-model).
-- Kræver care_staff_can_access_resident(text) (20260406130000).

-- ── Tabeller (IF NOT EXISTS — ældre projekter kan allerede have dem) ───────────

CREATE TABLE IF NOT EXISTS public.resident_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id text NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'aktivitet',
  emoji text,
  time_of_day text NOT NULL DEFAULT '09:00',
  recurrence text NOT NULL DEFAULT 'none',
  recurrence_days jsonb NOT NULL DEFAULT '[]',
  recurrence_week_parity text,
  notify boolean NOT NULL DEFAULT false,
  notify_minutes_before integer NOT NULL DEFAULT 10,
  created_by text NOT NULL DEFAULT 'resident',
  staff_suggestion boolean NOT NULL DEFAULT false,
  approved_by_resident boolean NOT NULL DEFAULT true,
  active_from date NOT NULL DEFAULT (CURRENT_DATE),
  active_until date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resident_plan_items_resident_idx
  ON public.resident_plan_items (resident_id);

CREATE TABLE IF NOT EXISTS public.resident_badges (
  resident_id text NOT NULL,
  badge_key text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (resident_id, badge_key)
);

CREATE INDEX IF NOT EXISTS resident_badges_resident_idx
  ON public.resident_badges (resident_id);

-- Kolonner tilføjet i app senere (gør eksisterende tabeller kompatible)
ALTER TABLE public.resident_plan_items
  ADD COLUMN IF NOT EXISTS recurrence_week_parity text,
  ADD COLUMN IF NOT EXISTS active_until date;

-- ── resident_plan_items RLS ───────────────────────────────────────────────────

ALTER TABLE public.resident_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rpi_staff_select" ON public.resident_plan_items;
DROP POLICY IF EXISTS "rpi_staff_insert" ON public.resident_plan_items;
DROP POLICY IF EXISTS "rpi_staff_update" ON public.resident_plan_items;
DROP POLICY IF EXISTS "rpi_staff_delete" ON public.resident_plan_items;
DROP POLICY IF EXISTS "rpi_resident_select" ON public.resident_plan_items;
DROP POLICY IF EXISTS "rpi_resident_insert" ON public.resident_plan_items;
DROP POLICY IF EXISTS "rpi_resident_update" ON public.resident_plan_items;
DROP POLICY IF EXISTS "rpi_resident_delete" ON public.resident_plan_items;

CREATE POLICY "rpi_staff_select"
  ON public.resident_plan_items
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id));

CREATE POLICY "rpi_staff_insert"
  ON public.resident_plan_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id));

CREATE POLICY "rpi_staff_update"
  ON public.resident_plan_items
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id))
  WITH CHECK (public.care_staff_can_access_resident(resident_id));

CREATE POLICY "rpi_staff_delete"
  ON public.resident_plan_items
  FOR DELETE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id));

CREATE POLICY "rpi_resident_select"
  ON public.resident_plan_items
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = resident_id);

CREATE POLICY "rpi_resident_insert"
  ON public.resident_plan_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = resident_id);

CREATE POLICY "rpi_resident_update"
  ON public.resident_plan_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = resident_id)
  WITH CHECK (auth.uid()::text = resident_id);

CREATE POLICY "rpi_resident_delete"
  ON public.resident_plan_items
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = resident_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resident_plan_items TO authenticated;

-- ── resident_badges RLS ─────────────────────────────────────────────────────

ALTER TABLE public.resident_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rb_staff_select" ON public.resident_badges;
DROP POLICY IF EXISTS "rb_resident_select" ON public.resident_badges;
DROP POLICY IF EXISTS "rb_resident_insert" ON public.resident_badges;
DROP POLICY IF EXISTS "rb_resident_update" ON public.resident_badges;

CREATE POLICY "rb_staff_select"
  ON public.resident_badges
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id));

CREATE POLICY "rb_resident_select"
  ON public.resident_badges
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = resident_id);

CREATE POLICY "rb_resident_insert"
  ON public.resident_badges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = resident_id);

CREATE POLICY "rb_resident_update"
  ON public.resident_badges
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = resident_id)
  WITH CHECK (auth.uid()::text = resident_id);

GRANT SELECT, INSERT, UPDATE ON public.resident_badges TO authenticated;

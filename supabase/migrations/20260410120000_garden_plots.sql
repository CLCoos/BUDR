-- Lys "Min have": garden_plots + RLS (beboer egen have, personale org-scopet).
-- Kræver care_staff_can_access_resident(text) (20260406130000).

CREATE TABLE IF NOT EXISTS public.garden_plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id text NOT NULL,
  slot_index integer NOT NULL,
  plant_type text NOT NULL,
  plant_name text NOT NULL,
  goal_text text NOT NULL DEFAULT '',
  park_goal_id text,
  growth_stage integer NOT NULL DEFAULT 0,
  total_water integer NOT NULL DEFAULT 0,
  last_watered_at timestamptz,
  is_park_linked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT garden_plots_plant_type_check
    CHECK (plant_type IN ('tree', 'flower', 'herb', 'bush', 'vegetable')),
  CONSTRAINT garden_plots_growth_stage_check
    CHECK (growth_stage >= 0 AND growth_stage <= 4)
);

CREATE UNIQUE INDEX IF NOT EXISTS garden_plots_resident_slot_uidx
  ON public.garden_plots (resident_id, slot_index);

CREATE INDEX IF NOT EXISTS garden_plots_resident_idx
  ON public.garden_plots (resident_id);

ALTER TABLE public.garden_plots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gp_staff_select" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_staff_insert" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_staff_update" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_staff_delete" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_resident_select" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_resident_insert" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_resident_update" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_resident_delete" ON public.garden_plots;

CREATE POLICY "gp_staff_select"
  ON public.garden_plots
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "gp_staff_insert"
  ON public.garden_plots
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "gp_staff_update"
  ON public.garden_plots
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "gp_staff_delete"
  ON public.garden_plots
  FOR DELETE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "gp_resident_select"
  ON public.garden_plots
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = resident_id::text);

CREATE POLICY "gp_resident_insert"
  ON public.garden_plots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = resident_id::text);

CREATE POLICY "gp_resident_update"
  ON public.garden_plots
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = resident_id::text)
  WITH CHECK (auth.uid()::text = resident_id::text);

CREATE POLICY "gp_resident_delete"
  ON public.garden_plots
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = resident_id::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.garden_plots TO authenticated;

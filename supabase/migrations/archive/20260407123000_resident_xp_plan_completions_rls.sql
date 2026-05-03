-- XP + plan-gennemførsler: tabeller hvis mangler, RLS, og award_xp som SECURITY DEFINER
-- (så RPC virker selv med RLS; kun egen beboer må tildele XP til sig selv).
-- Kræver care_staff_can_access_resident(text) (20260406130000).

-- ── Niveau som i src/lib/dataService.ts (LEVEL_THRESHOLDS) ───────────────────

CREATE OR REPLACE FUNCTION public.care_level_from_total_xp(p_total integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT LEAST(
    5,
    CASE
      WHEN p_total >= 1000 THEN 5
      WHEN p_total >= 500 THEN 4
      WHEN p_total >= 250 THEN 3
      WHEN p_total >= 100 THEN 2
      ELSE 1
    END
  );
$$;

GRANT EXECUTE ON FUNCTION public.care_level_from_total_xp(integer) TO authenticated;

-- ── resident_xp ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.resident_xp (
  resident_id text PRIMARY KEY,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resident_xp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rx_staff_select" ON public.resident_xp;
DROP POLICY IF EXISTS "rx_resident_select" ON public.resident_xp;
DROP POLICY IF EXISTS "rx_resident_insert" ON public.resident_xp;
DROP POLICY IF EXISTS "rx_resident_update" ON public.resident_xp;

CREATE POLICY "rx_staff_select"
  ON public.resident_xp
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id));

CREATE POLICY "rx_resident_select"
  ON public.resident_xp
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = resident_id);

CREATE POLICY "rx_resident_insert"
  ON public.resident_xp
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = resident_id);

CREATE POLICY "rx_resident_update"
  ON public.resident_xp
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = resident_id)
  WITH CHECK (auth.uid()::text = resident_id);

GRANT SELECT, INSERT, UPDATE ON public.resident_xp TO authenticated;

-- RPC: kun egen resident_id; kører som definer og omgår RLS efter check
CREATE OR REPLACE FUNCTION public.award_xp(
  p_resident_id text,
  p_activity text,
  p_xp integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  add_xp integer := GREATEST(0, COALESCE(p_xp, 0));
  new_total integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF auth.uid()::text IS DISTINCT FROM p_resident_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.resident_xp (resident_id, total_xp, level, updated_at)
  VALUES (
    p_resident_id,
    add_xp,
    public.care_level_from_total_xp(add_xp),
    now()
  )
  ON CONFLICT (resident_id) DO UPDATE SET
    total_xp = public.resident_xp.total_xp + add_xp,
    level = public.care_level_from_total_xp(public.resident_xp.total_xp + add_xp),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(text, text, integer) TO authenticated;

-- ── resident_plan_completions ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.resident_plan_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id text NOT NULL,
  plan_item_id text NOT NULL,
  completion_date date NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resident_id, plan_item_id, completion_date)
);

CREATE INDEX IF NOT EXISTS resident_plan_completions_resident_date_idx
  ON public.resident_plan_completions (resident_id, completion_date);

ALTER TABLE public.resident_plan_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rpc_staff_select" ON public.resident_plan_completions;
DROP POLICY IF EXISTS "rpc_resident_select" ON public.resident_plan_completions;
DROP POLICY IF EXISTS "rpc_resident_insert" ON public.resident_plan_completions;
DROP POLICY IF EXISTS "rpc_resident_update" ON public.resident_plan_completions;
DROP POLICY IF EXISTS "rpc_resident_delete" ON public.resident_plan_completions;

CREATE POLICY "rpc_staff_select"
  ON public.resident_plan_completions
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id));

CREATE POLICY "rpc_resident_select"
  ON public.resident_plan_completions
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = resident_id);

CREATE POLICY "rpc_resident_insert"
  ON public.resident_plan_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = resident_id);

CREATE POLICY "rpc_resident_update"
  ON public.resident_plan_completions
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = resident_id)
  WITH CHECK (auth.uid()::text = resident_id);

CREATE POLICY "rpc_resident_delete"
  ON public.resident_plan_completions
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = resident_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resident_plan_completions TO authenticated;

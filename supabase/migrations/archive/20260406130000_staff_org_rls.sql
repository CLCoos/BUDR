-- Org-scoped staff RLS + beboer egen række (auth.uid = user_id).
-- Kræver care_is_portal_staff(), care_visible_facility_ids() (20260331140000).

CREATE OR REPLACE FUNCTION public.care_staff_can_access_resident(p_resident_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = p_resident_id
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (public.care_visible_facility_ids())
    );
$$;

GRANT EXECUTE ON FUNCTION public.care_staff_can_access_resident(text) TO authenticated;

-- ── care_residents ───────────────────────────────────────────────────────────

ALTER TABLE public.care_residents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "care_residents_staff_select" ON public.care_residents;
DROP POLICY IF EXISTS "care_residents_self_select" ON public.care_residents;
DROP POLICY IF EXISTS "care_residents_self_update" ON public.care_residents;

CREATE POLICY "care_residents_staff_select"
  ON public.care_residents
  FOR SELECT
  TO authenticated
  USING (
    care_is_portal_staff()
    AND org_id IS NOT NULL
    AND org_id = ANY (care_visible_facility_ids())
  );

CREATE POLICY "care_residents_self_select"
  ON public.care_residents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "care_residents_self_update"
  ON public.care_residents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, UPDATE ON public.care_residents TO authenticated;

-- ── park_daily_checkin (hvis tabellen findes; indsættelse via service role i API) ─

DO $$
BEGIN
  IF to_regclass('public.park_daily_checkin') IS NOT NULL THEN
    ALTER TABLE public.park_daily_checkin ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "pdc_staff_select" ON public.park_daily_checkin;
    EXECUTE $p$
      CREATE POLICY "pdc_staff_select"
        ON public.park_daily_checkin
        FOR SELECT
        TO authenticated
        USING (public.care_staff_can_access_resident(resident_id::text))
    $p$;
    GRANT SELECT ON public.park_daily_checkin TO authenticated;
  END IF;
END $$;

-- ── daily_plans ─────────────────────────────────────────────────────────────

ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dp_staff_select" ON public.daily_plans;
DROP POLICY IF EXISTS "dp_staff_insert" ON public.daily_plans;
DROP POLICY IF EXISTS "dp_staff_update" ON public.daily_plans;
DROP POLICY IF EXISTS "dp_staff_delete" ON public.daily_plans;

CREATE POLICY "dp_staff_select"
  ON public.daily_plans
  FOR SELECT
  TO authenticated
  USING (care_staff_can_access_resident(resident_id));

CREATE POLICY "dp_staff_insert"
  ON public.daily_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (care_staff_can_access_resident(resident_id));

CREATE POLICY "dp_staff_update"
  ON public.daily_plans
  FOR UPDATE
  TO authenticated
  USING (care_staff_can_access_resident(resident_id))
  WITH CHECK (care_staff_can_access_resident(resident_id));

CREATE POLICY "dp_staff_delete"
  ON public.daily_plans
  FOR DELETE
  TO authenticated
  USING (care_staff_can_access_resident(resident_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plans TO authenticated;

-- ── plan_proposals ────────────────────────────────────────────────────────────

ALTER TABLE public.plan_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pp_staff_select" ON public.plan_proposals;
DROP POLICY IF EXISTS "pp_staff_insert" ON public.plan_proposals;
DROP POLICY IF EXISTS "pp_staff_update" ON public.plan_proposals;
DROP POLICY IF EXISTS "pp_staff_delete" ON public.plan_proposals;

CREATE POLICY "pp_staff_select"
  ON public.plan_proposals
  FOR SELECT
  TO authenticated
  USING (care_staff_can_access_resident(resident_id));

CREATE POLICY "pp_staff_insert"
  ON public.plan_proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (care_staff_can_access_resident(resident_id));

CREATE POLICY "pp_staff_update"
  ON public.plan_proposals
  FOR UPDATE
  TO authenticated
  USING (care_staff_can_access_resident(resident_id))
  WITH CHECK (care_staff_can_access_resident(resident_id));

CREATE POLICY "pp_staff_delete"
  ON public.plan_proposals
  FOR DELETE
  TO authenticated
  USING (care_staff_can_access_resident(resident_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_proposals TO authenticated;

-- ── resident_medications (hvis tabellen findes) ───────────────────────────────

DO $$
BEGIN
  IF to_regclass('public.resident_medications') IS NOT NULL THEN
    ALTER TABLE public.resident_medications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "rm_staff_select" ON public.resident_medications;
    EXECUTE $p$
      CREATE POLICY "rm_staff_select"
        ON public.resident_medications
        FOR SELECT
        TO authenticated
        USING (public.care_staff_can_access_resident(resident_id::text))
    $p$;
    GRANT SELECT ON public.resident_medications TO authenticated;
  END IF;
END $$;

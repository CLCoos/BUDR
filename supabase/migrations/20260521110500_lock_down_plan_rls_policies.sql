-- HOTFIX: lock down plan tables that retained org-agnostic staff policies.
-- The baseline had permissive policies that let any portal staff touch rows
-- for residents outside their organisation.

BEGIN;

-- daily_plans ----------------------------------------------------------
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage plans" ON public.daily_plans;
DROP POLICY IF EXISTS "Staff see org plans" ON public.daily_plans;
DROP POLICY IF EXISTS "dp_staff_select" ON public.daily_plans;
DROP POLICY IF EXISTS "dp_staff_insert" ON public.daily_plans;
DROP POLICY IF EXISTS "dp_staff_update" ON public.daily_plans;
DROP POLICY IF EXISTS "dp_staff_delete" ON public.daily_plans;

CREATE POLICY daily_plans_staff_select_own_resident
  ON public.daily_plans FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY daily_plans_staff_insert_own_resident
  ON public.daily_plans FOR INSERT TO authenticated
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND (
      org_id IS NULL
      OR org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
    )
  );

CREATE POLICY daily_plans_staff_update_own_resident
  ON public.daily_plans FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND (
      org_id IS NULL
      OR org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
    )
  );

CREATE POLICY daily_plans_staff_delete_own_resident
  ON public.daily_plans FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

-- plan_proposals ------------------------------------------------------
ALTER TABLE public.plan_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff review proposals" ON public.plan_proposals;
DROP POLICY IF EXISTS "Staff see org proposals" ON public.plan_proposals;
DROP POLICY IF EXISTS "pp_staff_select" ON public.plan_proposals;
DROP POLICY IF EXISTS "pp_staff_insert" ON public.plan_proposals;
DROP POLICY IF EXISTS "pp_staff_update" ON public.plan_proposals;
DROP POLICY IF EXISTS "pp_staff_delete" ON public.plan_proposals;

CREATE POLICY plan_proposals_staff_select_own_resident
  ON public.plan_proposals FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY plan_proposals_staff_insert_own_resident
  ON public.plan_proposals FOR INSERT TO authenticated
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND (
      org_id IS NULL
      OR org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
    )
  );

CREATE POLICY plan_proposals_staff_update_own_resident
  ON public.plan_proposals FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND (
      org_id IS NULL
      OR org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
    )
  );

CREATE POLICY plan_proposals_staff_delete_own_resident
  ON public.plan_proposals FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

-- resident_plan_items -------------------------------------------------
ALTER TABLE public.resident_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_suggest_plan_items ON public.resident_plan_items;
DROP POLICY IF EXISTS staff_plan_items_org ON public.resident_plan_items;
DROP POLICY IF EXISTS "staff_plan_items_org" ON public.resident_plan_items;
DROP POLICY IF EXISTS "rpi_staff_select" ON public.resident_plan_items;
DROP POLICY IF EXISTS "rpi_staff_insert" ON public.resident_plan_items;
DROP POLICY IF EXISTS "rpi_staff_update" ON public.resident_plan_items;
DROP POLICY IF EXISTS "rpi_staff_delete" ON public.resident_plan_items;

CREATE POLICY resident_plan_items_staff_select_own_resident
  ON public.resident_plan_items FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY resident_plan_items_staff_insert_own_resident
  ON public.resident_plan_items FOR INSERT TO authenticated
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND (
      org_id IS NULL
      OR org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
    )
  );

CREATE POLICY resident_plan_items_staff_update_own_resident
  ON public.resident_plan_items FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND (
      org_id IS NULL
      OR org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
    )
  );

CREATE POLICY resident_plan_items_staff_delete_own_resident
  ON public.resident_plan_items FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

COMMIT;

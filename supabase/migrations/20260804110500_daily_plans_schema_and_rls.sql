-- Align daily_plans / plan_proposals with app column names and tighten staff RLS.
--
-- Baseline dump used `date` (no `plan_date` / `user_message` / `created_by` /
-- `updated_at`) while Lys + Care Portal APIs write/read `plan_date` and
-- `user_message`. That makes propose/approve/list fail against a schema from
-- this migration chain.
--
-- Baseline also granted any portal staff FOR ALL on daily_plans and unscoped
-- UPDATE on plan_proposals — cross-tenant write if a proposal/plan id is known.
-- Restore org-scoped access via care_staff_can_access_resident.

-- ── Column alignment (idempotent) ───────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_plans' AND column_name = 'date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_plans' AND column_name = 'plan_date'
  ) THEN
    ALTER TABLE public.daily_plans RENAME COLUMN date TO plan_date;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plan_proposals' AND column_name = 'date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plan_proposals' AND column_name = 'plan_date'
  ) THEN
    ALTER TABLE public.plan_proposals RENAME COLUMN date TO plan_date;
  END IF;
END $$;

ALTER TABLE public.daily_plans
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

ALTER TABLE public.plan_proposals
  ADD COLUMN IF NOT EXISTS user_message text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS daily_plans_resident_id_plan_date_key
  ON public.daily_plans (resident_id, plan_date);

CREATE INDEX IF NOT EXISTS daily_plans_resident_plan_date_idx
  ON public.daily_plans (resident_id, plan_date);

CREATE INDEX IF NOT EXISTS plan_proposals_resident_plan_date_status_idx
  ON public.plan_proposals (resident_id, plan_date, status);

-- ── RLS: drop permissive baseline policies ──────────────────────────────────

DROP POLICY IF EXISTS "Staff manage plans" ON public.daily_plans;
DROP POLICY IF EXISTS "Staff see org plans" ON public.daily_plans;
DROP POLICY IF EXISTS "Staff review proposals" ON public.plan_proposals;
DROP POLICY IF EXISTS "Staff see org proposals" ON public.plan_proposals;

DROP POLICY IF EXISTS "dp_staff_select" ON public.daily_plans;
DROP POLICY IF EXISTS "dp_staff_insert" ON public.daily_plans;
DROP POLICY IF EXISTS "dp_staff_update" ON public.daily_plans;
DROP POLICY IF EXISTS "dp_staff_delete" ON public.daily_plans;

DROP POLICY IF EXISTS "pp_staff_select" ON public.plan_proposals;
DROP POLICY IF EXISTS "pp_staff_insert" ON public.plan_proposals;
DROP POLICY IF EXISTS "pp_staff_update" ON public.plan_proposals;
DROP POLICY IF EXISTS "pp_staff_delete" ON public.plan_proposals;

ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dp_staff_select"
  ON public.daily_plans
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY "dp_staff_insert"
  ON public.daily_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY "dp_staff_update"
  ON public.daily_plans
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text))
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY "dp_staff_delete"
  ON public.daily_plans
  FOR DELETE
  TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY "pp_staff_select"
  ON public.plan_proposals
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY "pp_staff_insert"
  ON public.plan_proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY "pp_staff_update"
  ON public.plan_proposals
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text))
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY "pp_staff_delete"
  ON public.plan_proposals
  FOR DELETE
  TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_proposals TO authenticated;

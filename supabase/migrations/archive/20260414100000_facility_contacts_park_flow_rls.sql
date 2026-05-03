-- facility_contacts: krisekort (beboer SELECT for eget org) + portal-indstillinger (staff CRUD i synlig org).
-- park_* flow-tabeller (tankefanger, ressourceblomst, trafiklys-alerts, måltrappe): som resident_plan_items.
-- Kræver care_staff_can_access_resident(text), care_is_portal_staff(), care_visible_facility_ids().

-- ── facility_contacts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.facility_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  label text NOT NULL,
  phone text NOT NULL,
  available_hours text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS facility_contacts_facility_sort_idx
  ON public.facility_contacts (facility_id, sort_order);

ALTER TABLE public.facility_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fc_staff_select" ON public.facility_contacts;
DROP POLICY IF EXISTS "fc_staff_insert" ON public.facility_contacts;
DROP POLICY IF EXISTS "fc_staff_update" ON public.facility_contacts;
DROP POLICY IF EXISTS "fc_staff_delete" ON public.facility_contacts;
DROP POLICY IF EXISTS "fc_resident_select" ON public.facility_contacts;

CREATE POLICY "fc_staff_select"
  ON public.facility_contacts
  FOR SELECT
  TO authenticated
  USING (
    care_is_portal_staff()
    AND (facility_id::uuid = ANY (public.care_visible_facility_ids()))
  );

CREATE POLICY "fc_staff_insert"
  ON public.facility_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    care_is_portal_staff()
    AND (facility_id::uuid = ANY (public.care_visible_facility_ids()))
  );

CREATE POLICY "fc_staff_update"
  ON public.facility_contacts
  FOR UPDATE
  TO authenticated
  USING (
    care_is_portal_staff()
    AND (facility_id::uuid = ANY (public.care_visible_facility_ids()))
  )
  WITH CHECK (
    care_is_portal_staff()
    AND (facility_id::uuid = ANY (public.care_visible_facility_ids()))
  );

CREATE POLICY "fc_staff_delete"
  ON public.facility_contacts
  FOR DELETE
  TO authenticated
  USING (
    care_is_portal_staff()
    AND (facility_id::uuid = ANY (public.care_visible_facility_ids()))
  );

CREATE POLICY "fc_resident_select"
  ON public.facility_contacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id = auth.uid()
        AND cr.org_id IS NOT NULL
        AND cr.org_id::text = facility_contacts.facility_id::text
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_contacts TO authenticated;

-- ── park_thought_catch ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.park_thought_catch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id text NOT NULL,
  situation text NOT NULL,
  automatic_thought text NOT NULL,
  emotion text,
  emotion_score integer,
  counter_thought text,
  outcome_score integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS park_thought_catch_resident_idx
  ON public.park_thought_catch (resident_id, created_at DESC);

ALTER TABLE public.park_thought_catch ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ptc_staff_select" ON public.park_thought_catch;
DROP POLICY IF EXISTS "ptc_staff_insert" ON public.park_thought_catch;
DROP POLICY IF EXISTS "ptc_staff_update" ON public.park_thought_catch;
DROP POLICY IF EXISTS "ptc_staff_delete" ON public.park_thought_catch;
DROP POLICY IF EXISTS "ptc_resident_select" ON public.park_thought_catch;
DROP POLICY IF EXISTS "ptc_resident_insert" ON public.park_thought_catch;
DROP POLICY IF EXISTS "ptc_resident_update" ON public.park_thought_catch;
DROP POLICY IF EXISTS "ptc_resident_delete" ON public.park_thought_catch;

CREATE POLICY "ptc_staff_select"
  ON public.park_thought_catch FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "ptc_staff_insert"
  ON public.park_thought_catch FOR INSERT TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "ptc_staff_update"
  ON public.park_thought_catch FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "ptc_staff_delete"
  ON public.park_thought_catch FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "ptc_resident_select"
  ON public.park_thought_catch FOR SELECT TO authenticated
  USING (auth.uid()::text = resident_id::text);

CREATE POLICY "ptc_resident_insert"
  ON public.park_thought_catch FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = resident_id::text);

CREATE POLICY "ptc_resident_update"
  ON public.park_thought_catch FOR UPDATE TO authenticated
  USING (auth.uid()::text = resident_id::text)
  WITH CHECK (auth.uid()::text = resident_id::text);

CREATE POLICY "ptc_resident_delete"
  ON public.park_thought_catch FOR DELETE TO authenticated
  USING (auth.uid()::text = resident_id::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.park_thought_catch TO authenticated;

-- ── park_resource_profile ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.park_resource_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id text NOT NULL,
  petal_social text,
  petal_activities text,
  petal_strengths text,
  petal_support text,
  petal_body text,
  petal_values text,
  petal_history text,
  petal_dreams text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS park_resource_profile_resident_idx
  ON public.park_resource_profile (resident_id, version DESC);

ALTER TABLE public.park_resource_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prp_staff_select" ON public.park_resource_profile;
DROP POLICY IF EXISTS "prp_staff_insert" ON public.park_resource_profile;
DROP POLICY IF EXISTS "prp_staff_update" ON public.park_resource_profile;
DROP POLICY IF EXISTS "prp_staff_delete" ON public.park_resource_profile;
DROP POLICY IF EXISTS "prp_resident_select" ON public.park_resource_profile;
DROP POLICY IF EXISTS "prp_resident_insert" ON public.park_resource_profile;
DROP POLICY IF EXISTS "prp_resident_update" ON public.park_resource_profile;
DROP POLICY IF EXISTS "prp_resident_delete" ON public.park_resource_profile;

CREATE POLICY "prp_staff_select"
  ON public.park_resource_profile FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "prp_staff_insert"
  ON public.park_resource_profile FOR INSERT TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "prp_staff_update"
  ON public.park_resource_profile FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "prp_staff_delete"
  ON public.park_resource_profile FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "prp_resident_select"
  ON public.park_resource_profile FOR SELECT TO authenticated
  USING (auth.uid()::text = resident_id::text);

CREATE POLICY "prp_resident_insert"
  ON public.park_resource_profile FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = resident_id::text);

CREATE POLICY "prp_resident_update"
  ON public.park_resource_profile FOR UPDATE TO authenticated
  USING (auth.uid()::text = resident_id::text)
  WITH CHECK (auth.uid()::text = resident_id::text);

CREATE POLICY "prp_resident_delete"
  ON public.park_resource_profile FOR DELETE TO authenticated
  USING (auth.uid()::text = resident_id::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.park_resource_profile TO authenticated;

-- ── park_traffic_alerts ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.park_traffic_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id text NOT NULL,
  triggered_from text NOT NULL,
  color text NOT NULL,
  note text,
  acknowledged_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS park_traffic_alerts_resident_idx
  ON public.park_traffic_alerts (resident_id, created_at DESC);

ALTER TABLE public.park_traffic_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pta_staff_select" ON public.park_traffic_alerts;
DROP POLICY IF EXISTS "pta_staff_update" ON public.park_traffic_alerts;
DROP POLICY IF EXISTS "pta_staff_delete" ON public.park_traffic_alerts;
DROP POLICY IF EXISTS "pta_resident_select" ON public.park_traffic_alerts;
DROP POLICY IF EXISTS "pta_resident_insert" ON public.park_traffic_alerts;

CREATE POLICY "pta_staff_select"
  ON public.park_traffic_alerts FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "pta_staff_update"
  ON public.park_traffic_alerts FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "pta_staff_delete"
  ON public.park_traffic_alerts FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "pta_resident_select"
  ON public.park_traffic_alerts FOR SELECT TO authenticated
  USING (auth.uid()::text = resident_id::text);

CREATE POLICY "pta_resident_insert"
  ON public.park_traffic_alerts FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = resident_id::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.park_traffic_alerts TO authenticated;

-- ── park_goals ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.park_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id text NOT NULL,
  created_by_staff uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  target_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS park_goals_resident_idx
  ON public.park_goals (resident_id, created_at DESC);

ALTER TABLE public.park_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pg_staff_select" ON public.park_goals;
DROP POLICY IF EXISTS "pg_staff_insert" ON public.park_goals;
DROP POLICY IF EXISTS "pg_staff_update" ON public.park_goals;
DROP POLICY IF EXISTS "pg_staff_delete" ON public.park_goals;
DROP POLICY IF EXISTS "pg_resident_select" ON public.park_goals;

CREATE POLICY "pg_staff_select"
  ON public.park_goals FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "pg_staff_insert"
  ON public.park_goals FOR INSERT TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "pg_staff_update"
  ON public.park_goals FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "pg_staff_delete"
  ON public.park_goals FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "pg_resident_select"
  ON public.park_goals FOR SELECT TO authenticated
  USING (auth.uid()::text = resident_id::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.park_goals TO authenticated;

-- ── park_goal_steps ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.park_goal_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.park_goals (id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  title text NOT NULL,
  description text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  resident_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS park_goal_steps_goal_idx
  ON public.park_goal_steps (goal_id, step_number);

ALTER TABLE public.park_goal_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pgs_staff_select" ON public.park_goal_steps;
DROP POLICY IF EXISTS "pgs_staff_insert" ON public.park_goal_steps;
DROP POLICY IF EXISTS "pgs_staff_update" ON public.park_goal_steps;
DROP POLICY IF EXISTS "pgs_staff_delete" ON public.park_goal_steps;
DROP POLICY IF EXISTS "pgs_resident_select" ON public.park_goal_steps;
DROP POLICY IF EXISTS "pgs_resident_update" ON public.park_goal_steps;

CREATE POLICY "pgs_staff_select"
  ON public.park_goal_steps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.park_goals g
      WHERE g.id = goal_id
        AND public.care_staff_can_access_resident(g.resident_id::text)
    )
  );

CREATE POLICY "pgs_staff_insert"
  ON public.park_goal_steps FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.park_goals g
      WHERE g.id = goal_id
        AND public.care_staff_can_access_resident(g.resident_id::text)
    )
  );

CREATE POLICY "pgs_staff_update"
  ON public.park_goal_steps FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.park_goals g
      WHERE g.id = goal_id
        AND public.care_staff_can_access_resident(g.resident_id::text)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.park_goals g
      WHERE g.id = goal_id
        AND public.care_staff_can_access_resident(g.resident_id::text)
    )
  );

CREATE POLICY "pgs_staff_delete"
  ON public.park_goal_steps FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.park_goals g
      WHERE g.id = goal_id
        AND public.care_staff_can_access_resident(g.resident_id::text)
    )
  );

CREATE POLICY "pgs_resident_select"
  ON public.park_goal_steps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.park_goals g
      WHERE g.id = goal_id
        AND auth.uid()::text = g.resident_id::text
    )
  );

CREATE POLICY "pgs_resident_update"
  ON public.park_goal_steps FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.park_goals g
      WHERE g.id = goal_id
        AND auth.uid()::text = g.resident_id::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.park_goals g
      WHERE g.id = goal_id
        AND auth.uid()::text = g.resident_id::text
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.park_goal_steps TO authenticated;

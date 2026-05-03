-- KRAP-flow (components/krap): eje via profile_id (= auth.uid() i appen).
-- user_profiles: egen række + staff SELECT for beboere i org (AI/kompressions-kontekst).
-- ai_daily_usage: kun server (service role) skriver; bruger må evt. læse egen kvote.

-- ── daily_checkins ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text NOT NULL,
  user_id text,
  mood_score integer NOT NULL CHECK (mood_score >= 1 AND mood_score <= 10),
  what_filled_today text,
  checked_in_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_checkins_profile_checked_idx
  ON public.daily_checkins (profile_id, checked_in_at DESC);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dc_owner_select" ON public.daily_checkins;
DROP POLICY IF EXISTS "dc_owner_insert" ON public.daily_checkins;
DROP POLICY IF EXISTS "dc_owner_update" ON public.daily_checkins;
DROP POLICY IF EXISTS "dc_owner_delete" ON public.daily_checkins;
DROP POLICY IF EXISTS "dc_staff_select" ON public.daily_checkins;

CREATE POLICY "dc_owner_select"
  ON public.daily_checkins FOR SELECT TO authenticated
  USING (auth.uid()::text = profile_id::text);

CREATE POLICY "dc_owner_insert"
  ON public.daily_checkins FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::text = profile_id::text
    AND (user_id IS NULL OR auth.uid()::text = user_id::text)
  );

CREATE POLICY "dc_owner_update"
  ON public.daily_checkins FOR UPDATE TO authenticated
  USING (auth.uid()::text = profile_id::text)
  WITH CHECK (
    auth.uid()::text = profile_id::text
    AND (user_id IS NULL OR auth.uid()::text = user_id::text)
  );

CREATE POLICY "dc_owner_delete"
  ON public.daily_checkins FOR DELETE TO authenticated
  USING (auth.uid()::text = profile_id::text);

CREATE POLICY "dc_staff_select"
  ON public.daily_checkins FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident(profile_id::text));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_checkins TO authenticated;

-- ── goals (KRAP mål / GoalScaling) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text NOT NULL,
  goal_text text NOT NULL,
  current_score integer NOT NULL DEFAULT 5,
  next_step text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goals_profile_active_idx
  ON public.goals (profile_id, created_at DESC);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_owner_select" ON public.goals;
DROP POLICY IF EXISTS "goals_owner_insert" ON public.goals;
DROP POLICY IF EXISTS "goals_owner_update" ON public.goals;
DROP POLICY IF EXISTS "goals_owner_delete" ON public.goals;
DROP POLICY IF EXISTS "goals_staff_select" ON public.goals;

CREATE POLICY "goals_owner_select"
  ON public.goals FOR SELECT TO authenticated
  USING (auth.uid()::text = profile_id::text);

CREATE POLICY "goals_owner_insert"
  ON public.goals FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = profile_id::text);

CREATE POLICY "goals_owner_update"
  ON public.goals FOR UPDATE TO authenticated
  USING (auth.uid()::text = profile_id::text)
  WITH CHECK (auth.uid()::text = profile_id::text);

CREATE POLICY "goals_owner_delete"
  ON public.goals FOR DELETE TO authenticated
  USING (auth.uid()::text = profile_id::text);

CREATE POLICY "goals_staff_select"
  ON public.goals FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident(profile_id::text));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;

-- ── thought_checks ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.thought_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text NOT NULL,
  troubling_thought text NOT NULL,
  counter_thought text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS thought_checks_profile_idx
  ON public.thought_checks (profile_id, created_at DESC);

ALTER TABLE public.thought_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tc_owner_select" ON public.thought_checks;
DROP POLICY IF EXISTS "tc_owner_insert" ON public.thought_checks;
DROP POLICY IF EXISTS "tc_owner_delete" ON public.thought_checks;
DROP POLICY IF EXISTS "tc_staff_select" ON public.thought_checks;

CREATE POLICY "tc_owner_select"
  ON public.thought_checks FOR SELECT TO authenticated
  USING (auth.uid()::text = profile_id::text);

CREATE POLICY "tc_owner_insert"
  ON public.thought_checks FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = profile_id::text);

CREATE POLICY "tc_owner_delete"
  ON public.thought_checks FOR DELETE TO authenticated
  USING (auth.uid()::text = profile_id::text);

CREATE POLICY "tc_staff_select"
  ON public.thought_checks FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident(profile_id::text));

GRANT SELECT, INSERT, DELETE ON public.thought_checks TO authenticated;

-- ── resource_registrations ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.resource_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text NOT NULL,
  week_number integer NOT NULL,
  year integer NOT NULL,
  category text NOT NULL,
  what_went_well text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resource_registrations_profile_week_idx
  ON public.resource_registrations (profile_id, year, week_number);

ALTER TABLE public.resource_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rr_owner_select" ON public.resource_registrations;
DROP POLICY IF EXISTS "rr_owner_insert" ON public.resource_registrations;
DROP POLICY IF EXISTS "rr_owner_delete" ON public.resource_registrations;
DROP POLICY IF EXISTS "rr_staff_select" ON public.resource_registrations;

CREATE POLICY "rr_owner_select"
  ON public.resource_registrations FOR SELECT TO authenticated
  USING (auth.uid()::text = profile_id::text);

CREATE POLICY "rr_owner_insert"
  ON public.resource_registrations FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = profile_id::text);

CREATE POLICY "rr_owner_delete"
  ON public.resource_registrations FOR DELETE TO authenticated
  USING (auth.uid()::text = profile_id::text);

CREATE POLICY "rr_staff_select"
  ON public.resource_registrations FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident(profile_id::text));

GRANT SELECT, INSERT, DELETE ON public.resource_registrations TO authenticated;

-- ── user_profiles (AI roller m.m.; memory_payload valgfri) ───────────────────

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  memory_payload jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "up_self_select" ON public.user_profiles;
DROP POLICY IF EXISTS "up_self_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "up_self_update" ON public.user_profiles;
DROP POLICY IF EXISTS "up_staff_select" ON public.user_profiles;

CREATE POLICY "up_self_select"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "up_self_insert"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "up_self_update"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "up_staff_select"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident(id::text));

GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- ── ai_daily_usage (server skriver via service role) ─────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  call_count integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, usage_date)
);

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "adu_self_select" ON public.ai_daily_usage;

CREATE POLICY "adu_self_select"
  ON public.ai_daily_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.ai_daily_usage TO authenticated;

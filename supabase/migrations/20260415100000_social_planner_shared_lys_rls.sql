-- Fælles mål/beskeder/fejringer, udfordrings-afleveringer, team-planner, delt Lys.
-- Delt Lys: RLS begrænser rækker til deltagere; join via shared_lys_join_session (DEFINER) så kode ikke kan skanne alle ventende sessioner.

-- ── shared_goals ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shared_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  contact_id text NOT NULL,
  title text NOT NULL,
  description text,
  progress integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shared_goals_user_contact_idx
  ON public.shared_goals (user_id, contact_id, created_at DESC);

ALTER TABLE public.shared_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sg_owner_all" ON public.shared_goals;

CREATE POLICY "sg_owner_all"
  ON public.shared_goals
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_goals TO authenticated;

-- ── support_messages ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text NOT NULL,
  contact_id text NOT NULL,
  content text NOT NULL,
  is_from_user boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_thread_idx
  ON public.support_messages (sender_id, contact_id, created_at);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sm_participant_select" ON public.support_messages;
DROP POLICY IF EXISTS "sm_sender_insert" ON public.support_messages;

CREATE POLICY "sm_participant_select"
  ON public.support_messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = sender_id::text
    OR auth.uid()::text = contact_id::text
  );

CREATE POLICY "sm_sender_insert"
  ON public.support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = sender_id::text);

GRANT SELECT, INSERT ON public.support_messages TO authenticated;

-- ── celebration_notifications ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.celebration_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  contact_id text NOT NULL,
  message text NOT NULL,
  emoji text NOT NULL DEFAULT '🎉',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS celebration_notifications_user_contact_idx
  ON public.celebration_notifications (user_id, contact_id, created_at DESC);

ALTER TABLE public.celebration_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cn_owner_select" ON public.celebration_notifications;
DROP POLICY IF EXISTS "cn_owner_insert" ON public.celebration_notifications;
DROP POLICY IF EXISTS "cn_owner_update" ON public.celebration_notifications;

CREATE POLICY "cn_owner_select"
  ON public.celebration_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "cn_owner_insert"
  ON public.celebration_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "cn_owner_update"
  ON public.celebration_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

GRANT SELECT, INSERT, UPDATE ON public.celebration_notifications TO authenticated;

-- ── care_challenge_completions ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.care_challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_user_id uuid NOT NULL,
  challenge_id text NOT NULL,
  completed_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resident_user_id, challenge_id, completed_date)
);

CREATE INDEX IF NOT EXISTS care_challenge_completions_resident_idx
  ON public.care_challenge_completions (resident_user_id, completed_date DESC);

ALTER TABLE public.care_challenge_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ccc_resident_insert" ON public.care_challenge_completions;
DROP POLICY IF EXISTS "ccc_resident_select" ON public.care_challenge_completions;
DROP POLICY IF EXISTS "ccc_staff_select" ON public.care_challenge_completions;

CREATE POLICY "ccc_resident_insert"
  ON public.care_challenge_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = resident_user_id);

CREATE POLICY "ccc_resident_select"
  ON public.care_challenge_completions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = resident_user_id);

CREATE POLICY "ccc_staff_select"
  ON public.care_challenge_completions
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_user_id::text));

GRANT SELECT, INSERT ON public.care_challenge_completions TO authenticated;

-- ── care_planner_entries ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.care_planner_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organisations (id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  visible_to_resident boolean NOT NULL DEFAULT true,
  resident_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS care_planner_entries_window_idx
  ON public.care_planner_entries (starts_at, visible_to_resident);

CREATE INDEX IF NOT EXISTS care_planner_entries_resident_idx
  ON public.care_planner_entries (resident_user_id)
  WHERE resident_user_id IS NOT NULL;

ALTER TABLE public.care_planner_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cpe_resident_select" ON public.care_planner_entries;
DROP POLICY IF EXISTS "cpe_staff_select" ON public.care_planner_entries;
DROP POLICY IF EXISTS "cpe_staff_insert" ON public.care_planner_entries;
DROP POLICY IF EXISTS "cpe_staff_update" ON public.care_planner_entries;
DROP POLICY IF EXISTS "cpe_staff_delete" ON public.care_planner_entries;

CREATE POLICY "cpe_resident_select"
  ON public.care_planner_entries
  FOR SELECT
  TO authenticated
  USING (
    visible_to_resident = true
    AND (
      resident_user_id = auth.uid()
      OR (
        resident_user_id IS NULL
        AND org_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.care_residents cr
          WHERE cr.user_id = auth.uid()
            AND cr.org_id = care_planner_entries.org_id
        )
      )
    )
  );

CREATE POLICY "cpe_staff_select"
  ON public.care_planner_entries
  FOR SELECT
  TO authenticated
  USING (
    care_is_portal_staff()
    AND org_id IS NOT NULL
    AND org_id = ANY (public.care_visible_facility_ids())
    AND (
      resident_user_id IS NULL
      OR public.care_staff_can_access_resident(resident_user_id::text)
    )
  );

CREATE POLICY "cpe_staff_insert"
  ON public.care_planner_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    care_is_portal_staff()
    AND org_id IS NOT NULL
    AND org_id = ANY (public.care_visible_facility_ids())
    AND (
      resident_user_id IS NULL
      OR public.care_staff_can_access_resident(resident_user_id::text)
    )
  );

CREATE POLICY "cpe_staff_update"
  ON public.care_planner_entries
  FOR UPDATE
  TO authenticated
  USING (
    care_is_portal_staff()
    AND org_id IS NOT NULL
    AND org_id = ANY (public.care_visible_facility_ids())
  )
  WITH CHECK (
    care_is_portal_staff()
    AND org_id IS NOT NULL
    AND org_id = ANY (public.care_visible_facility_ids())
    AND (
      resident_user_id IS NULL
      OR public.care_staff_can_access_resident(resident_user_id::text)
    )
  );

CREATE POLICY "cpe_staff_delete"
  ON public.care_planner_entries
  FOR DELETE
  TO authenticated
  USING (
    care_is_portal_staff()
    AND org_id IS NOT NULL
    AND org_id = ANY (public.care_visible_facility_ids())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_planner_entries TO authenticated;

-- ── shared_lys_sessions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shared_lys_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  support_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_code)
);

CREATE INDEX IF NOT EXISTS shared_lys_sessions_host_idx ON public.shared_lys_sessions (user_id);
CREATE INDEX IF NOT EXISTS shared_lys_sessions_support_idx ON public.shared_lys_sessions (support_user_id);

ALTER TABLE public.shared_lys_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sls_select" ON public.shared_lys_sessions;
DROP POLICY IF EXISTS "sls_insert" ON public.shared_lys_sessions;
DROP POLICY IF EXISTS "sls_update" ON public.shared_lys_sessions;
DROP POLICY IF EXISTS "sls_delete" ON public.shared_lys_sessions;

CREATE POLICY "sls_select"
  ON public.shared_lys_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = support_user_id);

CREATE POLICY "sls_insert"
  ON public.shared_lys_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sls_update"
  ON public.shared_lys_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = support_user_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = support_user_id);

CREATE POLICY "sls_delete"
  ON public.shared_lys_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_lys_sessions TO authenticated;

-- ── shared_lys_events ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shared_lys_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.shared_lys_sessions (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  event_type text NOT NULL,
  color text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shared_lys_events_type_check CHECK (event_type IN ('color', 'message'))
);

CREATE INDEX IF NOT EXISTS shared_lys_events_session_idx
  ON public.shared_lys_events (session_id, created_at);

ALTER TABLE public.shared_lys_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sle_select" ON public.shared_lys_events;
DROP POLICY IF EXISTS "sle_insert" ON public.shared_lys_events;

CREATE POLICY "sle_select"
  ON public.shared_lys_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shared_lys_sessions s
      WHERE s.id = session_id
        AND (auth.uid() = s.user_id OR auth.uid() = s.support_user_id)
    )
  );

CREATE POLICY "sle_insert"
  ON public.shared_lys_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.shared_lys_sessions s
      WHERE s.id = session_id
        AND (auth.uid() = s.user_id OR auth.uid() = s.support_user_id)
    )
  );

GRANT SELECT, INSERT ON public.shared_lys_events TO authenticated;

-- ── Join session uden offentlig SELECT på alle aktive sessioner ────────────────

CREATE OR REPLACE FUNCTION public.shared_lys_join_session(p_session_code text)
RETURNS SETOF public.shared_lys_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.shared_lys_sessions%ROWTYPE;
BEGIN
  IF uid IS NULL OR p_session_code IS NULL OR length(trim(p_session_code)) = 0 THEN
    RETURN;
  END IF;

  SELECT * INTO rec
  FROM public.shared_lys_sessions
  WHERE upper(session_code) = upper(trim(p_session_code))
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF rec.user_id = uid THEN
    RETURN QUERY SELECT rec.*;
    RETURN;
  END IF;

  IF rec.support_user_id IS NOT NULL AND rec.support_user_id <> uid THEN
    RETURN;
  END IF;

  UPDATE public.shared_lys_sessions
  SET support_user_id = uid
  WHERE id = rec.id;

  SELECT * INTO rec FROM public.shared_lys_sessions WHERE id = rec.id;
  RETURN QUERY SELECT rec.*;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shared_lys_join_session(text) TO authenticated;
REVOKE ALL ON FUNCTION public.shared_lys_join_session(text) FROM PUBLIC;

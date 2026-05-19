-- Server-side resident device sessions (HttpOnly token hash + staff revoke)

BEGIN;

CREATE TABLE IF NOT EXISTS public.resident_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_user_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  session_token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.care_staff(id),
  revoke_reason text,
  user_agent text,
  ip_hash text
);

CREATE INDEX IF NOT EXISTS resident_sessions_token_hash_idx
  ON public.resident_sessions(session_token_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS resident_sessions_resident_active_idx
  ON public.resident_sessions(resident_user_id, revoked_at, expires_at);

ALTER TABLE public.resident_sessions ENABLE ROW LEVEL SECURITY;

-- Service role bruges af API til insert/lookup
CREATE POLICY resident_sessions_service_all
  ON public.resident_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Staff kan SE sessions for borgere i deres org
CREATE POLICY resident_sessions_staff_select_own_org
  ON public.resident_sessions FOR SELECT TO authenticated
  USING (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

-- Staff kan REVOKE (UPDATE) sessions i deres org
CREATE POLICY resident_sessions_staff_revoke_own_org
  ON public.resident_sessions FOR UPDATE TO authenticated
  USING (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()))
  WITH CHECK (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

COMMIT;

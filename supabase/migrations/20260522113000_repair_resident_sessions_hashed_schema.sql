-- Repair resident_sessions environments that predate the hashed-token schema.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.resident_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_user_id uuid,
  org_id uuid,
  session_token_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid,
  revoke_reason text,
  user_agent text,
  ip_hash text
);

ALTER TABLE public.resident_sessions
  ADD COLUMN IF NOT EXISTS resident_user_id uuid,
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS session_token_hash text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid,
  ADD COLUMN IF NOT EXISTS revoke_reason text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS ip_hash text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resident_sessions'
      AND column_name = 'resident_id'
  ) THEN
    EXECUTE '
      UPDATE public.resident_sessions
      SET resident_user_id = resident_id
      WHERE resident_user_id IS NULL
        AND resident_id IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resident_sessions'
      AND column_name = 'token'
  ) THEN
    EXECUTE '
      UPDATE public.resident_sessions
      SET session_token_hash = encode(digest(token::text, ''sha256''), ''hex'')
      WHERE session_token_hash IS NULL
        AND token IS NOT NULL
    ';
  END IF;
END $$;

UPDATE public.resident_sessions rs
SET org_id = cr.org_id
FROM public.care_residents cr
WHERE rs.org_id IS NULL
  AND rs.resident_user_id = cr.user_id;

DELETE FROM public.resident_sessions
WHERE resident_user_id IS NULL
   OR org_id IS NULL
   OR session_token_hash IS NULL;

ALTER TABLE public.resident_sessions
  ALTER COLUMN resident_user_id SET NOT NULL,
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN session_token_hash SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'resident_sessions_resident_user_id_fkey'
      AND conrelid = 'public.resident_sessions'::regclass
  ) THEN
    ALTER TABLE public.resident_sessions
      ADD CONSTRAINT resident_sessions_resident_user_id_fkey
      FOREIGN KEY (resident_user_id) REFERENCES public.care_residents(user_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS resident_sessions_token_hash_key
  ON public.resident_sessions(session_token_hash);

CREATE INDEX IF NOT EXISTS resident_sessions_token_hash_idx
  ON public.resident_sessions(session_token_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS resident_sessions_resident_active_idx
  ON public.resident_sessions(resident_user_id, revoked_at, expires_at);

ALTER TABLE public.resident_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resident_sessions_service_all ON public.resident_sessions;
CREATE POLICY resident_sessions_service_all
  ON public.resident_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS resident_sessions_staff_select_own_org ON public.resident_sessions;
CREATE POLICY resident_sessions_staff_select_own_org
  ON public.resident_sessions FOR SELECT TO authenticated
  USING (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

DROP POLICY IF EXISTS resident_sessions_staff_revoke_own_org ON public.resident_sessions;
CREATE POLICY resident_sessions_staff_revoke_own_org
  ON public.resident_sessions FOR UPDATE TO authenticated
  USING (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()))
  WITH CHECK (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

COMMIT;

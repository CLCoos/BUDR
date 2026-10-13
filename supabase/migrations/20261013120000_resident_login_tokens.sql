-- Engangs-login-links til borgerens enhed.
-- Personalet udsteder et link i Care Portal (360° → Enheder); borgeren åbner det
-- på sin telefon, og linket veksles til en HttpOnly resident_session. Linket
-- udløber efter kort tid og kan kun bruges én gang. Erstatter det tidligere
-- /app/<resident_uuid>-link, hvor borgerens id alene gav adgang.

BEGIN;

CREATE TABLE IF NOT EXISTS public.resident_login_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_user_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES public.care_staff(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_session_id uuid REFERENCES public.resident_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS resident_login_tokens_resident_idx
  ON public.resident_login_tokens(resident_user_id, created_at DESC);

ALTER TABLE public.resident_login_tokens ENABLE ROW LEVEL SECURITY;

-- Kun serveren (service role) udsteder og indløser tokens. Ingen klientadgang.
CREATE POLICY resident_login_tokens_service_all
  ON public.resident_login_tokens FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON public.resident_login_tokens FROM anon, authenticated;

COMMIT;

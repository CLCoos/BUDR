-- ─────────────────────────────────────────────────────────────
-- BUDR: Resident Auth Tables
-- Migration: 20260326000000_resident_auth
-- ─────────────────────────────────────────────────────────────

-- resident_pins
CREATE TABLE IF NOT EXISTS public.resident_pins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  pin_hash    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS resident_pins_resident_id_idx
  ON public.resident_pins (resident_id);

-- resident_webauthn_credentials
CREATE TABLE IF NOT EXISTS public.resident_webauthn_credentials (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id   uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key    text NOT NULL,
  counter       bigint NOT NULL DEFAULT 0,
  device_label  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- resident_sessions
CREATE TABLE IF NOT EXISTS public.resident_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at  timestamptz NOT NULL DEFAULT (now() + INTERVAL '12 hours'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resident_sessions_token_idx
  ON public.resident_sessions (token);

CREATE INDEX IF NOT EXISTS resident_sessions_expires_at_idx
  ON public.resident_sessions (expires_at);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.resident_pins               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_sessions           ENABLE ROW LEVEL SECURITY;

-- No direct client access to pins or webauthn creds (service_role only via edge functions)
CREATE POLICY "No client access – pins"
  ON public.resident_pins FOR ALL
  USING (false);

CREATE POLICY "No client access – webauthn"
  ON public.resident_webauthn_credentials FOR ALL
  USING (false);

-- Sessions: only readable by matching token via app.session_token setting
CREATE POLICY "Session owner can read own session"
  ON public.resident_sessions FOR SELECT
  USING (token = current_setting('app.session_token', true));

-- ─── updated_at trigger for resident_pins ──────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resident_pins_updated_at
  BEFORE UPDATE ON public.resident_pins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Cleanup expired sessions (call periodically via cron) ─────
CREATE OR REPLACE FUNCTION public.purge_expired_resident_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.resident_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

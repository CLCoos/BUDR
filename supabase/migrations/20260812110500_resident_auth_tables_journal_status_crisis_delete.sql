-- Critical schema/RLS gaps escaped the May 2026 baseline squash:
-- 1) set_resident_pin / resident-pin-verify / WebAuthn Edge functions need
--    resident_pins + resident_webauthn_credentials (never never created).
-- 2) Lys/portal journal workflow needs journal_status + approval columns
--    (archive migrations exist but are not on the active chain).
-- 3) crisis_plans staff DELETE allows permanent wipe of clinical crisis plans
--    with no Care Portal delete UI (upsert/update only).

BEGIN;

-- =====================================================================
-- 1) resident_pins — bcrypt hashes for Lys PIN login
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.resident_pins (
  resident_id uuid PRIMARY KEY REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resident_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resident_pins_service_all ON public.resident_pins;
CREATE POLICY resident_pins_service_all
  ON public.resident_pins FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.resident_pins FROM PUBLIC;
REVOKE ALL ON TABLE public.resident_pins FROM anon;
REVOKE ALL ON TABLE public.resident_pins FROM authenticated;
GRANT ALL ON TABLE public.resident_pins TO service_role;

-- =====================================================================
-- 2) resident_webauthn_credentials — biometric device keys
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.resident_webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  credential_id text NOT NULL,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resident_webauthn_credentials_credential_id_key UNIQUE (credential_id)
);

CREATE INDEX IF NOT EXISTS resident_webauthn_credentials_resident_idx
  ON public.resident_webauthn_credentials (resident_id);

ALTER TABLE public.resident_webauthn_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resident_webauthn_credentials_service_all ON public.resident_webauthn_credentials;
CREATE POLICY resident_webauthn_credentials_service_all
  ON public.resident_webauthn_credentials FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.resident_webauthn_credentials FROM PUBLIC;
REVOKE ALL ON TABLE public.resident_webauthn_credentials FROM anon;
REVOKE ALL ON TABLE public.resident_webauthn_credentials FROM authenticated;
GRANT ALL ON TABLE public.resident_webauthn_credentials TO service_role;

-- =====================================================================
-- 3) journal_entries — kladde / godkendt + approval metadata
-- =====================================================================
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS journal_status text;

UPDATE public.journal_entries
SET journal_status = 'godkendt'
WHERE journal_status IS NULL;

ALTER TABLE public.journal_entries
  ALTER COLUMN journal_status SET DEFAULT 'godkendt';

ALTER TABLE public.journal_entries
  ALTER COLUMN journal_status SET NOT NULL;

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_journal_status_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_journal_status_check
  CHECK (journal_status IN ('kladde', 'godkendt'));

CREATE INDEX IF NOT EXISTS idx_journal_entries_resident_status_created
  ON public.journal_entries (resident_id, journal_status, created_at DESC);

-- =====================================================================
-- 4) crisis_plans — revoke hard DELETE (staff use upsert/update only)
-- =====================================================================
DROP POLICY IF EXISTS crisis_plans_staff_delete ON public.crisis_plans;

REVOKE DELETE ON TABLE public.crisis_plans FROM authenticated;
REVOKE DELETE ON TABLE public.crisis_plans FROM anon;
REVOKE DELETE ON TABLE public.crisis_plans FROM PUBLIC;

COMMIT;

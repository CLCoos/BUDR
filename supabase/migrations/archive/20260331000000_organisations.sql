-- ── organisations table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organisations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  slug           text        UNIQUE NOT NULL,
  logo_url       text,
  primary_color  text        NOT NULL DEFAULT '#1D9E75',
  invite_code    text        UNIQUE NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── org_id on care_residents ──────────────────────────────────────────────────

ALTER TABLE public.care_residents
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- Authenticated staff can read the organisation row that matches their
-- user_metadata.org_id JWT claim.
CREATE POLICY "staff can read own org"
  ON public.organisations
  FOR SELECT
  TO authenticated
  USING (
    id = ((auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid)
  );

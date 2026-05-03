-- Offentlige henvendelser fra marketing (formular på websitet).
-- Indsættes kun via service role fra Next API — ikke direkte fra browser.

CREATE TABLE IF NOT EXISTS public.marketing_contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  institution text NOT NULL,
  role text NOT NULL,
  message text NOT NULL,
  source text NOT NULL DEFAULT 'marketing',
  referrer text,
  user_agent text,
  client_ip text
);

CREATE INDEX IF NOT EXISTS marketing_contact_submissions_created_at_idx
  ON public.marketing_contact_submissions (created_at DESC);

COMMENT ON TABLE public.marketing_contact_submissions IS
  'Marketing/contact form posts; RLS uden policies — kun service role/admin.';

ALTER TABLE public.marketing_contact_submissions ENABLE ROW LEVEL SECURITY;

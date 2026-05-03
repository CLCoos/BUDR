ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

CREATE INDEX IF NOT EXISTS organisations_deactivated_at_idx
  ON public.organisations (deactivated_at);

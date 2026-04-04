-- Journal workflow: kladde → godkendt (synlig i overdragelse, AI-kontekst m.m.)
-- Eksisterende rækker behandles som godkendt journal.

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
  ADD CONSTRAINT journal_entries_journal_status_check CHECK (journal_status IN ('kladde', 'godkendt'));

CREATE INDEX IF NOT EXISTS idx_journal_entries_resident_status_created
  ON public.journal_entries (resident_id, journal_status, created_at DESC);

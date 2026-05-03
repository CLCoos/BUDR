-- Base journal table (must exist before 20260404120000_journal_entries_journal_status.sql)
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL,
  staff_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  staff_name text NOT NULL,
  entry_text text NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_resident_created_at
  ON public.journal_entries (resident_id, created_at DESC);

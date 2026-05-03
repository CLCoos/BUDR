-- Reparer journal_status CHECK så »kladde« altid er tilladt
-- (fx hvis en ældre DB kun havde godkendt).
-- Safety: skip hvis kolonnen ikke findes endnu i miljøet.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'journal_entries'
      AND column_name = 'journal_status'
  ) THEN
    ALTER TABLE public.journal_entries
      DROP CONSTRAINT IF EXISTS journal_entries_journal_status_check;

    ALTER TABLE public.journal_entries
      ADD CONSTRAINT journal_entries_journal_status_check
      CHECK (journal_status IN ('kladde', 'godkendt'));
  END IF;
END
$$;

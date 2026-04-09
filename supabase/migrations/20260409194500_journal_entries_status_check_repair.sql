-- Reparer journal_status CHECK så »kladde« altid er tilladt (fx hvis en ældre DB kun havde godkendt).
ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_journal_status_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_journal_status_check
  CHECK (journal_status IN ('kladde', 'godkendt'));

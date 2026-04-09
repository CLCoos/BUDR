-- "Vis i dagbog": aftensamlet overblik over udvalgte journalnotater samme dag.
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS show_in_diary boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.journal_entries.show_in_diary IS
  'Når true vises notatet på Dagens dagbog for dags dato (København).';

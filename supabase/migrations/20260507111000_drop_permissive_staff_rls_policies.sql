-- Remove legacy permissive policies that make org-scoped staff policies ineffective.
-- PostgreSQL combines permissive RLS policies with OR, so USING (true) exposes all rows.

DO $$
BEGIN
  IF to_regclass('public.journal_entries') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Staff can read journal entries" ON public.journal_entries';
    EXECUTE 'DROP POLICY IF EXISTS "Staff can insert journal entries" ON public.journal_entries';
  END IF;

  IF to_regclass('public.resident_medications') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can read medications" ON public.resident_medications';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can insert medications" ON public.resident_medications';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can update medications" ON public.resident_medications';
  END IF;
END $$;

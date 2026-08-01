-- HOTFIX: Lys «private» journals must not be staff-visible drafts.
-- Also revoke hard DELETE on clinical journal/medication rows (no app callers;
-- prior consolidation accidentally reintroduced DELETE after archive RLS
-- only granted SELECT/INSERT/UPDATE).

BEGIN;

-- =====================================================================
-- 1) Resident-private flag + status value
-- =====================================================================
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS is_resident_private boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.journal_entries.is_resident_private IS
  'True when a Lys resident marked the entry as private (Kun for dig). Staff RLS excludes these rows.';

ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_journal_status_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_journal_status_check
  CHECK (journal_status IN ('kladde', 'godkendt', 'resident_private'));

-- Backfill from Lys BUDR_META privacy marker (best-effort text match).
UPDATE public.journal_entries
SET
  is_resident_private = true,
  journal_status = 'resident_private'
WHERE category = 'Lys journal'
  AND entry_text LIKE 'BUDR_META:%'
  AND entry_text ~ '"privacy"[[:space:]]*:[[:space:]]*"private"'
  AND is_resident_private = false;

CREATE INDEX IF NOT EXISTS idx_journal_entries_org_not_private_created
  ON public.journal_entries (org_id, created_at DESC)
  WHERE is_resident_private = false;

-- =====================================================================
-- 2) Staff RLS: never SELECT/UPDATE/DELETE resident-private rows
-- =====================================================================
DROP POLICY IF EXISTS journal_entries_staff_select_own_org ON public.journal_entries;
DROP POLICY IF EXISTS journal_entries_staff_insert_own_org ON public.journal_entries;
DROP POLICY IF EXISTS journal_entries_staff_update_own_org ON public.journal_entries;
DROP POLICY IF EXISTS journal_entries_staff_delete_own_org ON public.journal_entries;

CREATE POLICY journal_entries_staff_select_own_org
  ON public.journal_entries FOR SELECT TO authenticated
  USING (
    is_resident_private = false
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

CREATE POLICY journal_entries_staff_insert_own_org
  ON public.journal_entries FOR INSERT TO authenticated
  WITH CHECK (
    is_resident_private = false
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

CREATE POLICY journal_entries_staff_update_own_org
  ON public.journal_entries FOR UPDATE TO authenticated
  USING (
    is_resident_private = false
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  )
  WITH CHECK (
    is_resident_private = false
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

-- Intentionally no DELETE policy for journal_entries (clinical audit trail).

-- =====================================================================
-- 3) Medications: drop hard DELETE (status updates cover pause/stop)
-- =====================================================================
DROP POLICY IF EXISTS resident_medications_staff_delete_own_org ON public.resident_medications;

-- Keep table privileges aligned with archive intent (no DELETE).
REVOKE DELETE ON public.journal_entries FROM authenticated;
REVOKE DELETE ON public.resident_medications FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.journal_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.resident_medications TO authenticated;

COMMIT;

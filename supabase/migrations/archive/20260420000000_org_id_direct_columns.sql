-- Tilføj org_id direkte på de fem tabeller for at optimere RLS-performance.
-- Kolonnen er nullable (ingen NOT NULL) så eksisterende rækker ikke brydes.
-- Backfill sker via care_residents.
-- RLS-policies dropper og genopretter ved navn (idempotent).

-- ── 1. Kolonner ───────────────────────────────────────────────────────────────

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id);

ALTER TABLE public.care_concern_notes
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id);

ALTER TABLE public.resident_medications
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id);

ALTER TABLE public.care_portal_notifications
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id);

ALTER TABLE public.crisis_alerts
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id);

-- ── 2. Backfill fra care_residents ────────────────────────────────────────────

UPDATE public.journal_entries je
  SET org_id = cr.org_id
  FROM public.care_residents cr
  WHERE cr.user_id = je.resident_id
    AND je.org_id IS NULL;

UPDATE public.care_concern_notes ccn
  SET org_id = cr.org_id
  FROM public.care_residents cr
  WHERE cr.user_id = ccn.resident_id::uuid
    AND ccn.org_id IS NULL;

UPDATE public.resident_medications rm
  SET org_id = cr.org_id
  FROM public.care_residents cr
  WHERE cr.user_id = rm.resident_id
    AND rm.org_id IS NULL;

UPDATE public.care_portal_notifications cpn
  SET org_id = cr.org_id
  FROM public.care_residents cr
  WHERE cr.user_id = cpn.resident_id
    AND cpn.org_id IS NULL;

UPDATE public.crisis_alerts ca
  SET org_id = cr.org_id
  FROM public.care_residents cr
  WHERE cr.user_id = ca.resident_id
    AND ca.org_id IS NULL;

-- ── 3. Erstat RLS-policies med direkte org_id-tjek ───────────────────────────
-- Dropper de kendte navne (ingen fejl hvis de ikke eksisterer endnu) og
-- genopretter med direkte kolonne-sammenligning i stedet for join via care_residents.

DROP POLICY IF EXISTS "staff_journal_org" ON public.journal_entries;
DROP POLICY IF EXISTS "staff_concern_notes_org" ON public.care_concern_notes;
DROP POLICY IF EXISTS "staff_medications_org" ON public.resident_medications;
DROP POLICY IF EXISTS "staff_notifications_org" ON public.care_portal_notifications;
DROP POLICY IF EXISTS "staff_crisis_alerts_org" ON public.crisis_alerts;

CREATE POLICY "staff_journal_org" ON public.journal_entries
  FOR ALL
  USING (
    org_id = (SELECT org_id FROM public.care_staff WHERE id = auth.uid())
  );

CREATE POLICY "staff_concern_notes_org" ON public.care_concern_notes
  FOR ALL
  USING (
    org_id = (SELECT org_id FROM public.care_staff WHERE id = auth.uid())
  );

CREATE POLICY "staff_medications_org" ON public.resident_medications
  FOR ALL
  USING (
    org_id = (SELECT org_id FROM public.care_staff WHERE id = auth.uid())
  );

CREATE POLICY "staff_notifications_org" ON public.care_portal_notifications
  FOR ALL
  USING (
    org_id = (SELECT org_id FROM public.care_staff WHERE id = auth.uid())
  );

CREATE POLICY "staff_crisis_alerts_org" ON public.crisis_alerts
  FOR ALL
  USING (
    org_id = (SELECT org_id FROM public.care_staff WHERE id = auth.uid())
  );

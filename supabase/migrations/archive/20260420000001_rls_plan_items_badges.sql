-- RLS-policies for resident_plan_items og resident_badges.
-- Tilføjer org_id kolonner (direkte lookup) og staff-policies.
-- Eksisterende resident-policies (residents_own_plan_items, residents_own_badges)
-- bevares — de håndterer beboer-adgang via JWT sub.

-- ── 1. Kolonner ───────────────────────────────────────────────────────────────

ALTER TABLE public.resident_plan_items
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id);

ALTER TABLE public.resident_badges
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id);

-- ── 2. Backfill ───────────────────────────────────────────────────────────────

UPDATE public.resident_plan_items rpi
  SET org_id = cr.org_id
  FROM public.care_residents cr
  WHERE cr.user_id = rpi.resident_id
    AND rpi.org_id IS NULL;

UPDATE public.resident_badges rb
  SET org_id = cr.org_id
  FROM public.care_residents cr
  WHERE cr.user_id = rb.resident_id
    AND rb.org_id IS NULL;

-- ── 3. Staff-policies ─────────────────────────────────────────────────────────
-- Dropper og genopretter (idempotent).

DROP POLICY IF EXISTS "staff_plan_items_org" ON public.resident_plan_items;
CREATE POLICY "staff_plan_items_org" ON public.resident_plan_items
  FOR ALL
  USING (
    org_id = (SELECT org_id FROM public.care_staff WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "staff_badges_org" ON public.resident_badges;
CREATE POLICY "staff_badges_org" ON public.resident_badges
  FOR ALL
  USING (
    org_id = (SELECT org_id FROM public.care_staff WHERE id = auth.uid())
  );

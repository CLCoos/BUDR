-- Statusudtalelse til kommunen før opfølgningsmøde (§107/§108).
-- Én række pr. udtalelse. Sektionerne ligger som jsonb {sektionsnøgle: tekst}.
--   * læsning kræver view_360, oprettelse og redigering kræver write_journal (+ adgang til borgeren)
--   * org skal matche borgeren; created_by er den indloggede
--   * ingen DELETE; en færdig udtalelse kan ikke redigeres
--   * en trigger fastholder id, borger, org og oprettelsesfelter og sætter updated_at

CREATE TABLE IF NOT EXISTS public.resident_status_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'kladde' CHECK (status IN ('kladde', 'faerdig')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  meeting_date date,
  paragraph text CHECK (paragraph IS NULL OR char_length(paragraph) <= 40),
  contact_person text CHECK (contact_person IS NULL OR char_length(contact_person) <= 200),
  sections jsonb NOT NULL DEFAULT '{}',
  created_by uuid DEFAULT auth.uid() REFERENCES public.care_staff(id) ON DELETE SET NULL,
  updated_by uuid DEFAULT auth.uid() REFERENCES public.care_staff(id) ON DELETE SET NULL,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resident_status_reports_period CHECK (period_end >= period_start),
  CONSTRAINT resident_status_reports_size CHECK (
    octet_length(sections::text) <= 100000 AND jsonb_typeof(sections) = 'object'
  )
);

CREATE INDEX IF NOT EXISTS resident_status_reports_resident_idx
  ON public.resident_status_reports (resident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS resident_status_reports_org_idx
  ON public.resident_status_reports (org_id);
CREATE INDEX IF NOT EXISTS resident_status_reports_created_by_idx
  ON public.resident_status_reports (created_by);
CREATE INDEX IF NOT EXISTS resident_status_reports_updated_by_idx
  ON public.resident_status_reports (updated_by);

ALTER TABLE public.resident_status_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY resident_status_reports_staff_select
  ON public.resident_status_reports FOR SELECT TO authenticated
  USING (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('view_360')
  );

CREATE POLICY resident_status_reports_staff_insert
  ON public.resident_status_reports FOR INSERT TO authenticated
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('write_journal')
    AND created_by = (SELECT auth.uid())
    AND status = 'kladde'
    AND org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
  );

CREATE POLICY resident_status_reports_staff_update
  ON public.resident_status_reports FOR UPDATE TO authenticated
  USING (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('write_journal')
    AND status = 'kladde'
  )
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('write_journal')
  );

CREATE OR REPLACE FUNCTION public.resident_status_reports_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.org_id IS DISTINCT FROM OLD.org_id
     OR NEW.resident_id IS DISTINCT FROM OLD.resident_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Borger, organisation og oprettelse kan ikke ændres på en statusudtalelse';
  END IF;
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  IF NEW.status = 'faerdig' AND OLD.status <> 'faerdig' THEN
    NEW.finished_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER resident_status_reports_guard
  BEFORE UPDATE ON public.resident_status_reports
  FOR EACH ROW EXECUTE FUNCTION public.resident_status_reports_guard();

REVOKE ALL ON public.resident_status_reports FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.resident_status_reports TO authenticated;

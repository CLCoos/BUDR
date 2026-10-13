-- VUM 2.0: én vurdering pr. borger/sag med de 11 temaer, funktionsniveauer og mål.
-- Bygger på feature/vum-2-sprint-1 (maj 2026), strammet op:
--   * læsning kræver view_360, skrivning kræver write_journal (+ adgang til borgeren)
--   * org skal matche borgeren; case_opened_by er den indloggede
--   * ingen DELETE (en vurdering arkiveres); arkiverede vurderinger er låst
--   * en trigger fastholder id, borger, org og oprettelsesfelter og sætter updated_at
--   * størrelsesgrænser på fritekst og jsonb

CREATE TABLE IF NOT EXISTS public.vum_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  case_opened_at timestamptz NOT NULL DEFAULT now(),
  case_opened_by uuid DEFAULT auth.uid() REFERENCES public.care_staff(id) ON DELETE SET NULL,
  referral_source text CHECK (referral_source IS NULL OR char_length(referral_source) <= 2000),
  case_purpose text CHECK (case_purpose IS NULL OR char_length(case_purpose) <= 2000),
  theme_1_physical jsonb NOT NULL DEFAULT '{}',
  theme_2_mental jsonb NOT NULL DEFAULT '{}',
  theme_3_health_social jsonb NOT NULL DEFAULT '{}',
  theme_4_communication jsonb NOT NULL DEFAULT '{}',
  theme_5_practical jsonb NOT NULL DEFAULT '{}',
  theme_6_selfcare jsonb NOT NULL DEFAULT '{}',
  theme_7_mobility jsonb NOT NULL DEFAULT '{}',
  theme_8_relationships jsonb NOT NULL DEFAULT '{}',
  theme_9_society jsonb NOT NULL DEFAULT '{}',
  theme_10_personal jsonb NOT NULL DEFAULT '{}',
  theme_11_environment jsonb NOT NULL DEFAULT '{}',
  function_levels jsonb NOT NULL DEFAULT '{}',
  goals jsonb NOT NULL DEFAULT '[]',
  last_followup_at timestamptz,
  next_followup_due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vum_assessments_size CHECK (
    octet_length(theme_1_physical::text) <= 20000
    AND octet_length(theme_2_mental::text) <= 20000
    AND octet_length(theme_3_health_social::text) <= 20000
    AND octet_length(theme_4_communication::text) <= 20000
    AND octet_length(theme_5_practical::text) <= 20000
    AND octet_length(theme_6_selfcare::text) <= 20000
    AND octet_length(theme_7_mobility::text) <= 20000
    AND octet_length(theme_8_relationships::text) <= 20000
    AND octet_length(theme_9_society::text) <= 20000
    AND octet_length(theme_10_personal::text) <= 20000
    AND octet_length(theme_11_environment::text) <= 20000
    AND octet_length(function_levels::text) <= 2000
    AND octet_length(goals::text) <= 50000
    AND jsonb_typeof(goals) = 'array'
  )
);

CREATE INDEX IF NOT EXISTS vum_assessments_resident_idx
  ON public.vum_assessments (resident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS vum_assessments_org_idx
  ON public.vum_assessments (org_id, status, updated_at DESC);

ALTER TABLE public.vum_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY vum_assessments_staff_select
  ON public.vum_assessments FOR SELECT TO authenticated
  USING (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('view_360')
  );

CREATE POLICY vum_assessments_staff_insert
  ON public.vum_assessments FOR INSERT TO authenticated
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('write_journal')
    AND case_opened_by = auth.uid()
    AND status = 'draft'
    AND org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
  );

CREATE POLICY vum_assessments_staff_update
  ON public.vum_assessments FOR UPDATE TO authenticated
  USING (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('write_journal')
    AND status <> 'archived'
  )
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('write_journal')
  );

CREATE OR REPLACE FUNCTION public.vum_assessments_guard()
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
     OR NEW.case_opened_at IS DISTINCT FROM OLD.case_opened_at
     OR NEW.case_opened_by IS DISTINCT FROM OLD.case_opened_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Borger, organisation og oprettelse kan ikke ændres på en VUM-vurdering';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER vum_assessments_guard
  BEFORE UPDATE ON public.vum_assessments
  FOR EACH ROW EXECUTE FUNCTION public.vum_assessments_guard();

REVOKE ALL ON public.vum_assessments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.vum_assessments TO authenticated;

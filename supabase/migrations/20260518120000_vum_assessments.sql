-- VUM 2.0 assessments + CHIME → VUM mapping (Sprint 1 datamodel)

-- ─── Reference: CHIME dimension → VUM theme weights ─────────────────────────

CREATE TABLE public.chime_to_vum_mapping (
  chime_dimension text NOT NULL CHECK (
    chime_dimension = ANY (
      ARRAY['connectedness', 'hope', 'identity', 'meaning', 'empowerment']
    )
  ),
  vum_theme_number smallint NOT NULL CHECK (vum_theme_number BETWEEN 1 AND 11),
  weight numeric(4, 2) NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1),
  PRIMARY KEY (chime_dimension, vum_theme_number)
);

INSERT INTO public.chime_to_vum_mapping (chime_dimension, vum_theme_number, weight) VALUES
  ('connectedness', 8, 1.0),
  ('connectedness', 9, 0.5),
  ('hope', 10, 1.0),
  ('identity', 10, 1.0),
  ('meaning', 9, 0.7),
  ('meaning', 10, 0.7),
  ('empowerment', 5, 0.8),
  ('empowerment', 6, 0.8),
  ('empowerment', 10, 0.5);

ALTER TABLE public.chime_to_vum_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY chime_to_vum_mapping_select ON public.chime_to_vum_mapping
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.chime_to_vum_mapping TO authenticated;

-- ─── VUM 2.0 assessment per borger / sag ────────────────────────────────────

CREATE TABLE public.vum_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'draft' CHECK (status = ANY (ARRAY['draft', 'active', 'archived'])),

  case_opened_at timestamptz NOT NULL DEFAULT now(),
  case_opened_by uuid REFERENCES public.care_staff(id) ON DELETE SET NULL,
  referral_source text,
  case_purpose text,

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
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vum_assessments_resident_idx ON public.vum_assessments (resident_id, created_at DESC);
CREATE INDEX vum_assessments_org_idx ON public.vum_assessments (org_id, status, updated_at DESC);

ALTER TABLE public.vum_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY vum_assessments_staff_select ON public.vum_assessments
  FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY vum_assessments_staff_insert ON public.vum_assessments
  FOR INSERT TO authenticated
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY vum_assessments_staff_update ON public.vum_assessments
  FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text))
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY vum_assessments_staff_delete ON public.vum_assessments
  FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vum_assessments TO authenticated;

-- Audit action for VUM assessments
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (
  action = ANY (
    ARRAY[
      'plan_proposal.approved',
      'plan_proposal.rejected',
      'daily_plan.created',
      'daily_plan.updated',
      'resident.created',
      'resident.updated',
      'resident_pin.changed',
      'resident.login',
      'resident.login_failed',
      'staff.login',
      'staff.logout',
      'staff.invite',
      'staff.registered',
      'org.created',
      'journal.entry_created',
      'checkin.submitted',
      'reflection.created',
      'next_step.created',
      'next_step.completed',
      'recovery_story.approved',
      'recovery_profile.updated',
      'vum_assessment.created',
      'vum_assessment.updated'
    ]
  )
);

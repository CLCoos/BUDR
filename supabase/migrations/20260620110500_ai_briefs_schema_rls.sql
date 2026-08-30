-- AI-briefs shown in resident 360. Contains AI-derived resident health summaries,
-- so staff access must stay scoped to the resident's organisation.

CREATE TABLE IF NOT EXISTS public.ai_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  brief_type text NOT NULL CHECK (brief_type = ANY (ARRAY['daily', 'weekly'])),
  lead text NOT NULL,
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(bullets) = 'array'),
  actions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(actions) = 'array'),
  source_window_start date NOT NULL,
  source_window_end date NOT NULL,
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_briefs_resident_created_idx
  ON public.ai_briefs (resident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_briefs_org_created_idx
  ON public.ai_briefs (org_id, created_at DESC);

ALTER TABLE public.ai_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_briefs_staff_select_own_org ON public.ai_briefs;
DROP POLICY IF EXISTS ai_briefs_staff_insert_own_org ON public.ai_briefs;

CREATE POLICY ai_briefs_staff_select_own_org
  ON public.ai_briefs
  FOR SELECT
  TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_can_access_resident(resident_id::text)
  );

CREATE POLICY ai_briefs_staff_insert_own_org
  ON public.ai_briefs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_can_access_resident(resident_id::text)
  );

REVOKE ALL ON public.ai_briefs FROM anon;
REVOKE ALL ON public.ai_briefs FROM authenticated;
GRANT SELECT, INSERT ON public.ai_briefs TO authenticated;

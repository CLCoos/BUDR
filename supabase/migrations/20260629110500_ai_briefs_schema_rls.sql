CREATE TABLE IF NOT EXISTS public.ai_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id text NOT NULL,
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  brief_type text NOT NULL CHECK (brief_type IN ('daily', 'weekly')),
  lead text NOT NULL,
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_window_start date NOT NULL,
  source_window_end date NOT NULL,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_briefs_resident_created
  ON public.ai_briefs (resident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_briefs_org_created
  ON public.ai_briefs (org_id, created_at DESC);

ALTER TABLE public.ai_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_briefs_staff_select" ON public.ai_briefs;
CREATE POLICY "ai_briefs_staff_select"
  ON public.ai_briefs
  FOR SELECT
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id = ANY (public.care_visible_facility_ids())
    AND public.care_staff_can_access_resident(resident_id::text)
  );

DROP POLICY IF EXISTS "ai_briefs_staff_insert" ON public.ai_briefs;
CREATE POLICY "ai_briefs_staff_insert"
  ON public.ai_briefs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id = ANY (public.care_visible_facility_ids())
    AND public.care_staff_can_access_resident(resident_id::text)
  );

REVOKE ALL ON public.ai_briefs FROM anon;
GRANT SELECT, INSERT ON public.ai_briefs TO authenticated;
GRANT ALL ON public.ai_briefs TO service_role;

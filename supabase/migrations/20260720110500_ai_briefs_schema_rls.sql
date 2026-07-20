-- AI-genererede beboerbriefs. Indholdet er organisationsafgrænset og må kun
-- læses/oprettes af portalpersonale med adgang til den tilknyttede beboer.
CREATE TABLE IF NOT EXISTS public.ai_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL,
  org_id uuid NOT NULL,
  brief_type text NOT NULL,
  lead text NOT NULL,
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_window_start date NOT NULL,
  source_window_end date NOT NULL,
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_briefs_brief_type_check CHECK (brief_type IN ('daily', 'weekly'))
);

CREATE INDEX IF NOT EXISTS ai_briefs_resident_created_idx
  ON public.ai_briefs (resident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_briefs_org_created_idx
  ON public.ai_briefs (org_id, created_at DESC);

ALTER TABLE public.ai_briefs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_briefs FROM anon;
REVOKE ALL ON TABLE public.ai_briefs FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.ai_briefs TO authenticated;
GRANT ALL ON TABLE public.ai_briefs TO service_role;

DROP POLICY IF EXISTS ai_briefs_staff_select ON public.ai_briefs;
CREATE POLICY ai_briefs_staff_select
  ON public.ai_briefs
  FOR SELECT
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id = ANY (public.care_visible_facility_ids())
    AND EXISTS (
      SELECT 1
      FROM public.care_residents AS cr
      WHERE cr.user_id = ai_briefs.resident_id
        AND cr.org_id = ai_briefs.org_id
    )
  );

DROP POLICY IF EXISTS ai_briefs_staff_insert ON public.ai_briefs;
CREATE POLICY ai_briefs_staff_insert
  ON public.ai_briefs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id = ANY (public.care_visible_facility_ids())
    AND EXISTS (
      SELECT 1
      FROM public.care_residents AS cr
      WHERE cr.user_id = ai_briefs.resident_id
        AND cr.org_id = ai_briefs.org_id
    )
  );

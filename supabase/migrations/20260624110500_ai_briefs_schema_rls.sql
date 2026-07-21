-- AI-genererede beboer-briefs til 360-overblik og planlagt cron-generering.
-- Indeholder PHI og må kun læses/skrives af personale i beboerens organisation
-- eller af service-role jobs.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  brief_type text NOT NULL DEFAULT 'daily',
  lead text NOT NULL,
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_window_start date NOT NULL,
  source_window_end date NOT NULL,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_briefs_brief_type_check CHECK (brief_type IN ('daily', 'weekly'))
);

CREATE INDEX IF NOT EXISTS ai_briefs_resident_created_idx
  ON public.ai_briefs (resident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_briefs_org_created_idx
  ON public.ai_briefs (org_id, created_at DESC);

ALTER TABLE public.ai_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_briefs_service_all ON public.ai_briefs;
CREATE POLICY ai_briefs_service_all
  ON public.ai_briefs FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS ai_briefs_staff_select_own_org ON public.ai_briefs;
CREATE POLICY ai_briefs_staff_select_own_org
  ON public.ai_briefs FOR SELECT TO authenticated
  USING (
    public.care_staff_can_access_resident(resident_id::text)
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

DROP POLICY IF EXISTS ai_briefs_staff_insert_own_org ON public.ai_briefs;
CREATE POLICY ai_briefs_staff_insert_own_org
  ON public.ai_briefs FOR INSERT TO authenticated
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

GRANT SELECT, INSERT ON public.ai_briefs TO authenticated;

COMMIT;

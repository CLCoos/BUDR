-- AI-genererede 10-sekunders briefs til 360°-overblik.
-- Service role (cron) bypasser RLS; staff må kun læse/skrive i egen organisation.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  brief_type text NOT NULL CHECK (brief_type = ANY (ARRAY['daily', 'weekly'])),
  lead text NOT NULL,
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_window_start date NOT NULL,
  source_window_end date NOT NULL,
  model text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_briefs_resident_type_window_unique
    UNIQUE (resident_id, brief_type, source_window_end)
);

CREATE INDEX IF NOT EXISTS ai_briefs_resident_created_idx
  ON public.ai_briefs USING btree (resident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_briefs_org_created_idx
  ON public.ai_briefs USING btree (org_id, created_at DESC);

ALTER TABLE public.ai_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_briefs_staff_select_own_org ON public.ai_briefs;
CREATE POLICY ai_briefs_staff_select_own_org
  ON public.ai_briefs FOR SELECT TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_can_access_resident(resident_id::text)
  );

DROP POLICY IF EXISTS ai_briefs_staff_insert_own_org ON public.ai_briefs;
CREATE POLICY ai_briefs_staff_insert_own_org
  ON public.ai_briefs FOR INSERT TO authenticated
  WITH CHECK (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_can_access_resident(resident_id::text)
  );

DROP POLICY IF EXISTS ai_briefs_staff_update_own_org ON public.ai_briefs;
CREATE POLICY ai_briefs_staff_update_own_org
  ON public.ai_briefs FOR UPDATE TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_can_access_resident(resident_id::text)
  )
  WITH CHECK (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_can_access_resident(resident_id::text)
  );

GRANT SELECT, INSERT, UPDATE ON public.ai_briefs TO authenticated;

COMMIT;

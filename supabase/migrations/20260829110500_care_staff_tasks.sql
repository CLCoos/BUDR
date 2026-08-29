-- Live Care Portal «Opgaver» (dashboard + planner).
-- Staff gemte hidtil kun i React-state og så fiktive Solhaven-beboere (Finn L., kriseplan …).
-- Org-scopet via care_staff.org_id + care_staff_can_access_resident.
-- Ingen DELETE — opgaver afsluttes via status.

CREATE TABLE IF NOT EXISTS public.care_staff_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  deadline date NOT NULL,
  assigned_to text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'åben',
  priority text NOT NULL DEFAULT 'mellem',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_staff_tasks_title_len CHECK (
    char_length(title) >= 1 AND char_length(title) <= 500
  ),
  CONSTRAINT care_staff_tasks_assigned_len CHECK (char_length(assigned_to) <= 32),
  CONSTRAINT care_staff_tasks_status_check CHECK (
    status = ANY (ARRAY['åben'::text, 'igangsat'::text, 'afsluttet'::text])
  ),
  CONSTRAINT care_staff_tasks_priority_check CHECK (
    priority = ANY (ARRAY['lav'::text, 'mellem'::text, 'høj'::text])
  )
);

CREATE INDEX IF NOT EXISTS care_staff_tasks_org_deadline_idx
  ON public.care_staff_tasks (org_id, deadline);

CREATE INDEX IF NOT EXISTS care_staff_tasks_resident_idx
  ON public.care_staff_tasks (resident_id, deadline);

ALTER TABLE public.care_staff_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS care_staff_tasks_staff_select_own_org ON public.care_staff_tasks;
CREATE POLICY care_staff_tasks_staff_select_own_org
  ON public.care_staff_tasks
  FOR SELECT
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_can_access_resident((resident_id)::text)
  );

DROP POLICY IF EXISTS care_staff_tasks_staff_insert_own_org ON public.care_staff_tasks;
CREATE POLICY care_staff_tasks_staff_insert_own_org
  ON public.care_staff_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_can_access_resident((resident_id)::text)
    AND (created_by IS NULL OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS care_staff_tasks_staff_update_own_org ON public.care_staff_tasks;
CREATE POLICY care_staff_tasks_staff_update_own_org
  ON public.care_staff_tasks
  FOR UPDATE
  TO authenticated
  USING (
    public.care_is_portal_staff()
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_can_access_resident((resident_id)::text)
  )
  WITH CHECK (
    public.care_is_portal_staff()
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_can_access_resident((resident_id)::text)
  );

GRANT SELECT, INSERT, UPDATE ON public.care_staff_tasks TO authenticated;
REVOKE DELETE ON public.care_staff_tasks FROM PUBLIC, anon, authenticated;

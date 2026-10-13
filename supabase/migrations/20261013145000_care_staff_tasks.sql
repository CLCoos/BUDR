-- Live Care Portal «Opgaver» (dashboard + planner) gemmes i databasen.
-- Hidtil kun React-state med fiktive beboere. Org-scopet + care_staff_can_access_resident.
-- Ingen DELETE: opgaver afsluttes via status.

BEGIN;

CREATE TABLE IF NOT EXISTS public.care_staff_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  deadline date NOT NULL,
  assigned_to text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'åben',
  priority text NOT NULL DEFAULT 'mellem',
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_staff_tasks_title_len CHECK (char_length(title) BETWEEN 1 AND 500),
  CONSTRAINT care_staff_tasks_assigned_len CHECK (char_length(assigned_to) <= 32),
  CONSTRAINT care_staff_tasks_status_check CHECK (status IN ('åben', 'igangsat', 'afsluttet')),
  CONSTRAINT care_staff_tasks_priority_check CHECK (priority IN ('lav', 'mellem', 'høj'))
);

CREATE INDEX IF NOT EXISTS care_staff_tasks_org_deadline_idx
  ON public.care_staff_tasks (org_id, deadline);
CREATE INDEX IF NOT EXISTS care_staff_tasks_resident_idx
  ON public.care_staff_tasks (resident_id, deadline);

ALTER TABLE public.care_staff_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY care_staff_tasks_staff_select
  ON public.care_staff_tasks FOR SELECT TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_can_access_resident(resident_id::text)
  );

CREATE POLICY care_staff_tasks_staff_insert
  ON public.care_staff_tasks FOR INSERT TO authenticated
  WITH CHECK (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
    AND public.care_staff_can_access_resident(resident_id::text)
    AND created_by = auth.uid()
  );

CREATE POLICY care_staff_tasks_staff_update
  ON public.care_staff_tasks FOR UPDATE TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_can_access_resident(resident_id::text)
  )
  WITH CHECK (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
    AND public.care_staff_can_access_resident(resident_id::text)
  );

-- created_by og created_at kan ikke omskrives
CREATE OR REPLACE FUNCTION public.care_staff_tasks_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER care_staff_tasks_guard
  BEFORE UPDATE ON public.care_staff_tasks
  FOR EACH ROW EXECUTE FUNCTION public.care_staff_tasks_guard();

REVOKE ALL ON public.care_staff_tasks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.care_staff_tasks TO authenticated;

COMMIT;

-- Allow care_staff.role = 'gæst' so portal invites for the seeded system role
-- succeed. Previously CHECK only allowed leder|medarbejder, while Settings
-- lists org_roles ordered by name (gæst first) and POST /api/portal/invite-staff
-- copied org_roles.name into care_staff.role — insert failed silently.

ALTER TABLE public.care_staff DROP CONSTRAINT IF EXISTS care_staff_role_check;

ALTER TABLE public.care_staff
  ADD CONSTRAINT care_staff_role_check
  CHECK (role = ANY (ARRAY['leder'::text, 'medarbejder'::text, 'gæst'::text]));

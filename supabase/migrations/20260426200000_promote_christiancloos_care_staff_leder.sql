-- One-off: christiancloos@outlook.com skal have leder-rolle i sit bosted (org fra care_staff).
-- Rettigheder (invite_staff, manage_roles, osv.) læses fra org_roles via care_staff.role_id.

UPDATE public.care_staff cs
SET
  role = 'leder',
  role_id = r.id
FROM public.org_roles r
WHERE r.org_id = cs.org_id
  AND r.name = 'leder'
  AND cs.id IN (
    SELECT u.id
    FROM auth.users u
    WHERE lower(u.email) = lower('christiancloos@outlook.com')
  );

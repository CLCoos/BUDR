CREATE TABLE IF NOT EXISTS public.org_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_system_role boolean NOT NULL DEFAULT false,
  permissions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

ALTER TABLE public.org_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_roles_own_org" ON public.org_roles;
CREATE POLICY "staff_roles_own_org" ON public.org_roles
  FOR ALL USING (
    org_id = (SELECT org_id FROM public.care_staff WHERE id = auth.uid())
  );

ALTER TABLE public.care_staff
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.org_roles(id);

ALTER TABLE public.care_staff
  ALTER COLUMN role DROP NOT NULL;

INSERT INTO public.org_roles (org_id, name, is_system_role, permissions)
SELECT
  o.id,
  x.name,
  true,
  '{}'::text[]
FROM public.organisations o
CROSS JOIN LATERAL unnest(ARRAY['leder', 'medarbejder', 'gæst']) AS x(name)
ON CONFLICT (org_id, name) DO NOTHING;

UPDATE public.org_roles
SET permissions = ARRAY[
  'view_dashboard','view_residents','write_journal','view_journal','view_360',
  'write_handover','view_handover','send_messages','view_messages','view_medications',
  'view_concern_notes','write_concern_notes','view_crisis_plans','write_medications',
  'approve_journal','view_park_plans','edit_park_plans','manage_shifts',
  'view_salary_estimate','invite_staff','manage_roles','import_residents',
  'view_audit_log','manage_residents'
]
WHERE is_system_role = true AND name = 'leder';

UPDATE public.org_roles
SET permissions = ARRAY[
  'view_dashboard','view_residents','write_journal','view_journal','view_360',
  'write_handover','view_handover','send_messages','view_messages','view_medications',
  'view_concern_notes','write_concern_notes','view_crisis_plans','view_park_plans'
]
WHERE is_system_role = true AND name = 'medarbejder';

UPDATE public.org_roles
SET permissions = ARRAY[
  'view_dashboard','view_residents','view_journal','view_handover','view_messages'
]
WHERE is_system_role = true AND name = 'gæst';

UPDATE public.care_staff cs
SET role_id = r.id
FROM public.org_roles r
WHERE r.org_id = cs.org_id
  AND r.name = COALESCE(cs.role, 'medarbejder')
  AND cs.role_id IS NULL;

CREATE OR REPLACE FUNCTION public.org_roles_seed_defaults_after_org_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.org_roles (org_id, name, is_system_role, permissions)
  VALUES
    (NEW.id, 'leder', true, ARRAY[
      'view_dashboard','view_residents','write_journal','view_journal','view_360',
      'write_handover','view_handover','send_messages','view_messages','view_medications',
      'view_concern_notes','write_concern_notes','view_crisis_plans','write_medications',
      'approve_journal','view_park_plans','edit_park_plans','manage_shifts',
      'view_salary_estimate','invite_staff','manage_roles','import_residents',
      'view_audit_log','manage_residents'
    ]::text[]),
    (NEW.id, 'medarbejder', true, ARRAY[
      'view_dashboard','view_residents','write_journal','view_journal','view_360',
      'write_handover','view_handover','send_messages','view_messages','view_medications',
      'view_concern_notes','write_concern_notes','view_crisis_plans','view_park_plans'
    ]::text[]),
    (NEW.id, 'gæst', true, ARRAY[
      'view_dashboard','view_residents','view_journal','view_handover','view_messages'
    ]::text[])
  ON CONFLICT (org_id, name) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_roles_seed_defaults ON public.organisations;
CREATE TRIGGER trg_org_roles_seed_defaults
AFTER INSERT ON public.organisations
FOR EACH ROW EXECUTE FUNCTION public.org_roles_seed_defaults_after_org_insert();

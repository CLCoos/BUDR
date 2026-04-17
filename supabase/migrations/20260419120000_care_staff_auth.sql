-- care_staff authentication — source of truth for staff authorisation.
--
-- Strategi: i stedet for at genskabe alle downstream RLS-policies opdateres
-- de to helper-funktioner (care_is_portal_staff, care_visible_facility_ids)
-- til at bruge care_staff-tabellen. Det betyder at AL eksisterende RLS på
-- journal_entries, care_residents, daily_plans osv. automatisk bruger den
-- nye tabel uden at skulle røres.
--
-- Rækkefølge:
--   1. care_staff tabel + RLS
--   2. Opdater care_is_portal_staff() og care_visible_facility_ids()
--   3. Migrer eksisterende staff-brugere (backfill fra user_metadata)
--   4. Udvid audit_logs action-constraint

-- ── 1. care_staff tabel ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.care_staff (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     uuid        NOT NULL REFERENCES public.organisations(id),
  full_name  text        NOT NULL,
  role       text        NOT NULL DEFAULT 'medarbejder'
             CHECK (role IN ('leder', 'medarbejder')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.care_staff ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.care_staff TO authenticated;

-- Kan altid læse sin egen række (direkte id-match, ingen policy-rekursion)
DROP POLICY IF EXISTS "staff_select_self" ON public.care_staff;
CREATE POLICY "staff_select_self"
  ON public.care_staff
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Kan se kolleger i samme org via SECURITY DEFINER-funktion (ingen rekursion)
DROP POLICY IF EXISTS "staff_select_own_org" ON public.care_staff;
CREATE POLICY "staff_select_own_org"
  ON public.care_staff
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT unnest(public.care_visible_facility_ids()))
  );

-- ── 2. Opdater helper-funktioner til at bruge care_staff ─────────────────────
-- SECURITY DEFINER: funktionen kører som ejer (postgres) og bypasser RLS på
-- care_staff — undgår rekursion i ovenstående policies.

CREATE OR REPLACE FUNCTION public.care_is_portal_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.care_staff WHERE id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.care_is_portal_staff() TO authenticated;

CREATE OR REPLACE FUNCTION public.care_visible_facility_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT org_id FROM public.care_staff WHERE id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.care_visible_facility_ids() TO authenticated;

-- ── 3. Backfill: eksisterende staff-brugere → care_staff ─────────────────────
-- Migrer brugere der allerede har org_id i user_metadata så de ikke mister adgang.

INSERT INTO public.care_staff (id, org_id, full_name, role)
SELECT
  au.id,
  (au.raw_user_meta_data ->> 'org_id')::uuid,
  COALESCE(
    au.raw_user_meta_data ->> 'display_name',
    au.raw_user_meta_data ->> 'full_name',
    split_part(au.email, '@', 1)
  ),
  CASE
    WHEN au.raw_user_meta_data ->> 'role' IN ('leder', 'medarbejder')
      THEN au.raw_user_meta_data ->> 'role'
    ELSE 'medarbejder'
  END
FROM auth.users au
WHERE
  au.raw_user_meta_data ->> 'org_id' IS NOT NULL
  AND (au.raw_user_meta_data ->> 'org_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.organisations o
    WHERE o.id = (au.raw_user_meta_data ->> 'org_id')::uuid
  )
ON CONFLICT (id) DO NOTHING;

-- ── 4. Udvid audit_logs action-constraint ────────────────────────────────────
-- Tilføj staff.invite og staff.registered som gyldige actions.

ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
    'plan_proposal.approved',
    'plan_proposal.rejected',
    'daily_plan.created',
    'daily_plan.updated',
    'resident.created',
    'resident.updated',
    'resident_pin.changed',
    'staff.login',
    'staff.logout',
    'staff.invite',
    'staff.registered',
    'org.created'
  ));

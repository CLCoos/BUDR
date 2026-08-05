-- HOTFIX: privilege escalation + cross-tenant writes + broken org settings
-- 1) org_roles: FOR ALL let any org staff rewrite permissions (escalate to manage_roles)
-- 2) resident_plan_items: staff_suggest_plan_items INSERT only checked staff_suggestion=true
-- 3) organisations: SELECT-only RLS blocked PATCH for name display / Lys default voice
-- 4) marketing_content_blocks: any portal staff could mutate public site copy via client RLS

BEGIN;

-- ── Helper: mirror app permission resolution (role_id.permissions, else role fallback) ──
CREATE OR REPLACE FUNCTION public.care_staff_has_permission(p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_role_id uuid;
  v_perms text[];
BEGIN
  SELECT cs.role, cs.role_id
    INTO v_role, v_role_id
  FROM public.care_staff cs
  WHERE cs.id = auth.uid();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_role_id IS NOT NULL THEN
    SELECT r.permissions INTO v_perms
    FROM public.org_roles r
    WHERE r.id = v_role_id;

    IF v_perms IS NOT NULL AND cardinality(v_perms) > 0 THEN
      RETURN p_permission = ANY (v_perms);
    END IF;
  END IF;

  -- Fallback mirrors DEFAULT_ROLE_PERMISSIONS in src/lib/permissions.ts
  IF v_role = 'leder' THEN
    RETURN true;
  END IF;

  IF v_role = 'gæst' THEN
    RETURN p_permission = ANY (ARRAY[
      'view_dashboard',
      'view_residents',
      'view_journal',
      'view_handover',
      'view_messages'
    ]);
  END IF;

  -- medarbejder (default)
  RETURN p_permission = ANY (ARRAY[
    'view_dashboard',
    'view_residents',
    'write_journal',
    'view_journal',
    'view_360',
    'write_handover',
    'view_handover',
    'send_messages',
    'view_messages',
    'view_medications',
    'view_concern_notes',
    'write_concern_notes',
    'view_crisis_plans',
    'view_park_plans'
  ]);
END;
$$;

REVOKE ALL ON FUNCTION public.care_staff_has_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.care_staff_has_permission(text) TO authenticated;

-- ── org_roles: SELECT for own org; writes require manage_roles ──
DROP POLICY IF EXISTS staff_roles_own_org ON public.org_roles;
DROP POLICY IF EXISTS "staff_roles_own_org" ON public.org_roles;

CREATE POLICY org_roles_staff_select_own_org
  ON public.org_roles
  FOR SELECT
  TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

CREATE POLICY org_roles_staff_insert_manage
  ON public.org_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('manage_roles')
  );

CREATE POLICY org_roles_staff_update_manage
  ON public.org_roles
  FOR UPDATE
  TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('manage_roles')
  )
  WITH CHECK (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('manage_roles')
  );

CREATE POLICY org_roles_staff_delete_manage
  ON public.org_roles
  FOR DELETE
  TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('manage_roles')
  );

-- ── resident_plan_items: drop open suggestion insert + org_id-only ALL ──
DROP POLICY IF EXISTS staff_suggest_plan_items ON public.resident_plan_items;
DROP POLICY IF EXISTS staff_plan_items_org ON public.resident_plan_items;
DROP POLICY IF EXISTS rpi_staff_select ON public.resident_plan_items;
DROP POLICY IF EXISTS rpi_staff_insert ON public.resident_plan_items;
DROP POLICY IF EXISTS rpi_staff_update ON public.resident_plan_items;
DROP POLICY IF EXISTS rpi_staff_delete ON public.resident_plan_items;

CREATE POLICY rpi_staff_select
  ON public.resident_plan_items
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id));

CREATE POLICY rpi_staff_insert
  ON public.resident_plan_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id));

CREATE POLICY rpi_staff_update
  ON public.resident_plan_items
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id))
  WITH CHECK (public.care_staff_can_access_resident(resident_id));

CREATE POLICY rpi_staff_delete
  ON public.resident_plan_items
  FOR DELETE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id));

-- ── organisations: allow settings updates for manage_roles in own org ──
DROP POLICY IF EXISTS "staff can update own org settings" ON public.organisations;

CREATE POLICY "staff can update own org settings"
  ON public.organisations
  FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('manage_roles')
  )
  WITH CHECK (
    id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('manage_roles')
  );

-- ── marketing_content_blocks: only manage_roles may mutate public CMS ──
DROP POLICY IF EXISTS mcb_staff_insert ON public.marketing_content_blocks;
DROP POLICY IF EXISTS mcb_staff_update ON public.marketing_content_blocks;

CREATE POLICY mcb_staff_insert
  ON public.marketing_content_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_has_permission('manage_roles'));

CREATE POLICY mcb_staff_update
  ON public.marketing_content_blocks
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_has_permission('manage_roles'))
  WITH CHECK (public.care_staff_has_permission('manage_roles'));

COMMIT;

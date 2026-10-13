-- Bølge 1: RLS-stramning (prod-tilstand verificeret 2026-10-13 via pg_policies).
-- 1) org_roles: enhver medarbejder kunne omskrive roller (inkl. give sig selv manage_roles).
-- 2) resident_plan_items: åben INSERT (staff_suggestion=true) uden org-tjek.
-- 3) daily_plans / plan_proposals: «care_is_portal_staff()» gav adgang på tværs af organisationer.
-- 4) organisations: ingen UPDATE-policy, så org-indstillinger kunne ikke gemmes.
-- 5) marketing_content_blocks: kunders personale kunne ændre BUDR's offentlige website.
--    Skrivning sker nu kun via API med service role og redaktør-allowlist.
-- 6) Kliniske data (journal, kriseplaner, Lys-samtaler, recovery-fortællinger) kunne slettes fra klienten.
-- 7) resident_sessions: staff UPDATE tillod at omskrive session_token_hash (overtagelse af borgersession).
--    Tilbagekald sker nu via API med service role.
-- 8) lys_safety_events: staff kunne ændre/viske safety-klassifikationen; nu kun kvittering.
-- 9) create_audit_log: kunne kaldes af enhver indlogget bruger (forfalskning af revisionsspor).

BEGIN;

-- ── Hjælper: spejler appens rettighedsopslag (role_id.permissions, ellers rolle-fallback) ──
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


-- ── 1) org_roles ──
DROP POLICY IF EXISTS staff_roles_own_org ON public.org_roles;
DROP POLICY IF EXISTS org_roles_staff_select_own_org ON public.org_roles;
DROP POLICY IF EXISTS org_roles_staff_insert_manage ON public.org_roles;
DROP POLICY IF EXISTS org_roles_staff_update_manage ON public.org_roles;
DROP POLICY IF EXISTS org_roles_staff_delete_manage ON public.org_roles;

CREATE POLICY org_roles_staff_select_own_org ON public.org_roles
  FOR SELECT TO authenticated
  USING (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

CREATE POLICY org_roles_staff_insert_manage ON public.org_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('manage_roles')
  );

CREATE POLICY org_roles_staff_update_manage ON public.org_roles
  FOR UPDATE TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('manage_roles')
  )
  WITH CHECK (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('manage_roles')
  );

CREATE POLICY org_roles_staff_delete_manage ON public.org_roles
  FOR DELETE TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('manage_roles')
  );

-- ── 2) resident_plan_items ──
DROP POLICY IF EXISTS staff_suggest_plan_items ON public.resident_plan_items;
DROP POLICY IF EXISTS staff_plan_items_org ON public.resident_plan_items;
DROP POLICY IF EXISTS rpi_staff_select ON public.resident_plan_items;
DROP POLICY IF EXISTS rpi_staff_insert ON public.resident_plan_items;
DROP POLICY IF EXISTS rpi_staff_update ON public.resident_plan_items;
DROP POLICY IF EXISTS rpi_staff_delete ON public.resident_plan_items;

CREATE POLICY rpi_staff_select ON public.resident_plan_items
  FOR SELECT TO authenticated USING (public.care_staff_can_access_resident(resident_id::text));
CREATE POLICY rpi_staff_insert ON public.resident_plan_items
  FOR INSERT TO authenticated WITH CHECK (public.care_staff_can_access_resident(resident_id::text));
CREATE POLICY rpi_staff_update ON public.resident_plan_items
  FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));
CREATE POLICY rpi_staff_delete ON public.resident_plan_items
  FOR DELETE TO authenticated USING (public.care_staff_can_access_resident(resident_id::text));

-- ── 3) daily_plans / plan_proposals ──
DROP POLICY IF EXISTS "Staff manage plans" ON public.daily_plans;
DROP POLICY IF EXISTS daily_plans_staff_insert ON public.daily_plans;
DROP POLICY IF EXISTS daily_plans_staff_update ON public.daily_plans;

CREATE POLICY daily_plans_staff_insert ON public.daily_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));
CREATE POLICY daily_plans_staff_update ON public.daily_plans
  FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

DROP POLICY IF EXISTS "Staff review proposals" ON public.plan_proposals;
DROP POLICY IF EXISTS plan_proposals_staff_review ON public.plan_proposals;

CREATE POLICY plan_proposals_staff_review ON public.plan_proposals
  FOR UPDATE TO authenticated
  USING (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('edit_park_plans')
  )
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('edit_park_plans')
  );

-- ── 4) organisations: indstillinger for ledere (manage_roles) i egen org ──
DROP POLICY IF EXISTS "staff can update own org settings" ON public.organisations;
CREATE POLICY "staff can update own org settings" ON public.organisations
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('manage_roles')
  )
  WITH CHECK (
    id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('manage_roles')
  );

-- ── 5) marketing_content_blocks: ingen klient-skrivning ──
DROP POLICY IF EXISTS mcb_staff_insert ON public.marketing_content_blocks;
DROP POLICY IF EXISTS mcb_staff_update ON public.marketing_content_blocks;

-- ── 6) Kliniske data kan ikke slettes fra klienten ──
DROP POLICY IF EXISTS journal_entries_staff_delete_own_org ON public.journal_entries;
DROP POLICY IF EXISTS crisis_plans_staff_delete ON public.crisis_plans;
DROP POLICY IF EXISTS lc_staff_delete ON public.lys_conversations;
DROP POLICY IF EXISTS lys_recovery_stories_staff_delete ON public.lys_recovery_stories;

-- ── 7) resident_sessions: ingen staff UPDATE ──
DROP POLICY IF EXISTS resident_sessions_staff_revoke_own_org ON public.resident_sessions;

-- ── 8) lys_safety_events: staff må kun kvittere ──
CREATE OR REPLACE FUNCTION public.lys_safety_events_ack_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'acknowledged_at' - 'acknowledged_by')
     IS DISTINCT FROM (to_jsonb(OLD) - 'acknowledged_at' - 'acknowledged_by') THEN
    RAISE EXCEPTION 'Kun kvittering (acknowledged_at/acknowledged_by) kan ændres på safety-events';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lys_safety_events_ack_only ON public.lys_safety_events;
CREATE TRIGGER lys_safety_events_ack_only
  BEFORE UPDATE ON public.lys_safety_events
  FOR EACH ROW EXECUTE FUNCTION public.lys_safety_events_ack_only();

-- ── 9) create_audit_log kun for serveren ──
REVOKE EXECUTE ON FUNCTION public.create_audit_log(text, text, uuid, uuid, text, uuid, jsonb, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_audit_log(text, text, uuid, uuid, text, uuid, jsonb, text)
  TO service_role;

COMMIT;

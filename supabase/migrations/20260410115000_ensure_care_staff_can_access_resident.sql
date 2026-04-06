-- Production had migration history out of sync: garden RLS needs this helper.
-- Idempotent with 20260406130000_staff_org_rls.sql (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.care_staff_can_access_resident(p_resident_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = p_resident_id
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (public.care_visible_facility_ids())
    );
$$;

GRANT EXECUTE ON FUNCTION public.care_staff_can_access_resident(text) TO authenticated;

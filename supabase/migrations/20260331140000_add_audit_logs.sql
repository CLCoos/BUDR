-- ── RLS helper functions (CREATE OR REPLACE — idempotent) ───────────────────
-- These helpers are referenced by RLS policies across the platform.
-- Defining them here ensures they exist before any policy that uses them.

-- Returns true when the calling session belongs to an authenticated staff
-- member — i.e. it has a valid org_id claim in the JWT user_metadata.
CREATE OR REPLACE FUNCTION public.care_is_portal_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'user_metadata' ->> 'org_id') IS NOT NULL
$$;

-- Returns the array of organisation UUIDs the current staff session may access.
-- Single-org today; extend this function when multi-org access is needed.
CREATE OR REPLACE FUNCTION public.care_visible_facility_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT ARRAY[
    ((auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid)
  ]::uuid[]
$$;


-- ── audit_logs ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL    DEFAULT now(),

  -- Who performed the action
  actor_type    text        NOT NULL,
  actor_id      uuid,                  -- auth.users.id (staff) or care_residents.user_id (resident)
  actor_org_id  uuid        REFERENCES public.organisations (id),

  -- What happened
  action        text        NOT NULL,

  -- What was affected
  target_table  text,
  target_id     uuid,

  -- Extra context (e.g. {"old_status":"pending","new_status":"approved"})
  metadata      jsonb,

  -- Network
  ip_address    text,

  CONSTRAINT audit_logs_actor_type_check
    CHECK (actor_type IN ('care_staff', 'resident', 'system')),

  CONSTRAINT audit_logs_action_check
    CHECK (action IN (
      'plan_proposal.approved',
      'plan_proposal.rejected',
      'daily_plan.created',
      'daily_plan.updated',
      'resident.created',
      'resident.updated',
      'resident_pin.changed',
      'staff.login',
      'staff.logout',
      'org.created'
    ))
);


-- ── Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Staff may SELECT rows that belong to their own organisation.
-- INSERT / UPDATE / DELETE are intentionally not granted here —
-- all writes must go through create_audit_log() (SECURITY DEFINER below).
CREATE POLICY "staff can read own org audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    care_is_portal_staff()
    AND actor_org_id = ANY (care_visible_facility_ids())
  );


-- ── SECURITY DEFINER write function ─────────────────────────────────────────
-- Owned by the postgres role so it runs with superuser privileges and bypasses
-- RLS. Edge functions and API routes call this via the service-role key;
-- no direct INSERT on audit_logs is possible via the anon or authenticated keys.

CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_actor_type    text,
  p_action        text,
  p_actor_id      uuid    DEFAULT NULL,
  p_actor_org_id  uuid    DEFAULT NULL,
  p_target_table  text    DEFAULT NULL,
  p_target_id     uuid    DEFAULT NULL,
  p_metadata      jsonb   DEFAULT NULL,
  p_ip_address    text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_type,
    actor_id,
    actor_org_id,
    action,
    target_table,
    target_id,
    metadata,
    ip_address
  ) VALUES (
    p_actor_type,
    p_actor_id,
    p_actor_org_id,
    p_action,
    p_target_table,
    p_target_id,
    p_metadata,
    p_ip_address
  );
END;
$$;

ALTER FUNCTION public.create_audit_log(
  text, text, uuid, uuid, text, uuid, jsonb, text
) OWNER TO postgres;


-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Portal queries: org-scoped log viewer, newest first
CREATE INDEX IF NOT EXISTS audit_logs_org_created_at_idx
  ON public.audit_logs (actor_org_id, created_at DESC);

-- Record-level history: "show me all events that touched this row"
CREATE INDEX IF NOT EXISTS audit_logs_target_idx
  ON public.audit_logs (target_table, target_id);

-- create_audit_log is SECURITY DEFINER and inserts into audit_logs.
-- Baseline never revoked default PUBLIC EXECUTE, so anon/authenticated could
-- forge arbitrary audit rows (actor, action, org) via PostgREST RPC.
-- Intended callers are service-role edge functions and admin server routes.

REVOKE ALL ON FUNCTION public.create_audit_log(
  text, text, uuid, uuid, text, uuid, jsonb, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.create_audit_log(
  text, text, uuid, uuid, text, uuid, jsonb, text
) FROM anon;

REVOKE ALL ON FUNCTION public.create_audit_log(
  text, text, uuid, uuid, text, uuid, jsonb, text
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.create_audit_log(
  text, text, uuid, uuid, text, uuid, jsonb, text
) TO service_role;

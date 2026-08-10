-- Harden award_xp RPC + revoke staff hard-DELETE on crisis/conversation tables.
--
-- 1) award_xp is SECURITY DEFINER with no auth.uid() check. Postgres grants
--    EXECUTE to PUBLIC by default, so anyone with the anon key can inflate or
--    create resident_xp rows for arbitrary UUIDs via PostgREST.
--    Awarding must go through /api/lys/award-xp (cookie-bound + service role).
--
-- 2) crisis_alerts had authenticated DELETE (crisis_alerts_staff_delete) plus
--    a leftover FOR ALL policy (staff_crisis_alerts_org). Resolve is status
--    UPDATE only — hard DELETE can wipe active emergencies.
--
-- 3) lys_conversations had lc_staff_delete — staff JWT can permanently destroy
--    Lys chat transcripts (PHI). No Care Portal DELETE UI.

BEGIN;

-- ── award_xp: service_role only ─────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.award_xp(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_xp(uuid, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.award_xp(uuid, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, text, integer) TO service_role;

-- ── crisis_alerts: no authenticated DELETE; drop FOR ALL org policy ─────────
DROP POLICY IF EXISTS crisis_alerts_staff_delete ON public.crisis_alerts;
DROP POLICY IF EXISTS staff_crisis_alerts_org ON public.crisis_alerts;

REVOKE DELETE ON public.crisis_alerts FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.crisis_alerts TO authenticated;

-- ── lys_conversations: no authenticated DELETE ──────────────────────────────
DROP POLICY IF EXISTS lc_staff_delete ON public.lys_conversations;
DROP POLICY IF EXISTS lc_resident_delete ON public.lys_conversations;

REVOKE DELETE ON public.lys_conversations FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lys_conversations TO authenticated;

COMMIT;

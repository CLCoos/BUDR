-- Critical correctness/security hardening (2026-08-11):
-- 1) care_portal_notifications: allow mood_alert + medication_missed (app already writes these;
--    CHECK previously rejected them → silent clinical alert loss).
-- 2) resident_sessions: drop staff UPDATE policy (revokes go through service-role API).
--    Previous policy allowed rewriting session_token_hash → resident impersonation.
-- 3) lys_safety_events: ack-only UPDATE trigger so staff cannot wipe risk evidence.

BEGIN;

-- ── 1) Expand notification type CHECK ───────────────────────────────────────
ALTER TABLE public.care_portal_notifications
  DROP CONSTRAINT IF EXISTS care_portal_notifications_type_check;

ALTER TABLE public.care_portal_notifications
  ADD CONSTRAINT care_portal_notifications_type_check
  CHECK (
    type = ANY (
      ARRAY[
        'lav_stemning'::text,
        'krise'::text,
        'besked'::text,
        'inaktivitet'::text,
        'mood_alert'::text,
        'medication_missed'::text
      ]
    )
  );

-- ── 2) resident_sessions: revoke via API/service_role only ───────────────────
DROP POLICY IF EXISTS resident_sessions_staff_revoke_own_org ON public.resident_sessions;

-- ── 3) lys_safety_events: only acknowledged_* may change on UPDATE ──────────
CREATE OR REPLACE FUNCTION public.lys_safety_events_ack_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.resident_id IS DISTINCT FROM OLD.resident_id
     OR NEW.organisation_id IS DISTINCT FROM OLD.organisation_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.risk_level IS DISTINCT FROM OLD.risk_level
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.reasoning IS DISTINCT FROM OLD.reasoning
     OR NEW.user_utterance IS DISTINCT FROM OLD.user_utterance
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'lys_safety_events: only acknowledged_at/acknowledged_by may be updated';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lys_safety_events_ack_only_trg ON public.lys_safety_events;
CREATE TRIGGER lys_safety_events_ack_only_trg
  BEFORE UPDATE ON public.lys_safety_events
  FOR EACH ROW
  EXECUTE FUNCTION public.lys_safety_events_ack_only();

COMMIT;

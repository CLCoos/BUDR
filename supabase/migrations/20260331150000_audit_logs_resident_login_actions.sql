-- Extend audit_logs action enum with resident login events.
-- CHECK constraints cannot be altered in-place — drop and recreate.

ALTER TABLE public.audit_logs
  DROP CONSTRAINT audit_logs_action_check;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
    'plan_proposal.approved',
    'plan_proposal.rejected',
    'daily_plan.created',
    'daily_plan.updated',
    'resident.created',
    'resident.updated',
    'resident_pin.changed',
    'resident.login',
    'resident.login_failed',
    'staff.login',
    'staff.logout',
    'org.created'
  ));

-- Extend audit_logs action enum for superadmin activity dashboards.
-- Keeps existing actions and adds explicit journal/check-in events.

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
    'resident.login',
    'resident.login_failed',
    'staff.login',
    'staff.logout',
    'staff.invite',
    'staff.registered',
    'org.created',
    'journal.entry_created',
    'checkin.submitted'
  ));

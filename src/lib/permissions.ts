export const PERMISSIONS = {
  // Daglig drift
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_RESIDENTS: 'view_residents',
  WRITE_JOURNAL: 'write_journal',
  VIEW_JOURNAL: 'view_journal',
  VIEW_360: 'view_360',
  WRITE_HANDOVER: 'write_handover',
  VIEW_HANDOVER: 'view_handover',
  SEND_MESSAGES: 'send_messages',
  VIEW_MESSAGES: 'view_messages',
  VIEW_MEDICATIONS: 'view_medications',
  VIEW_CONCERN_NOTES: 'view_concern_notes',
  WRITE_CONCERN_NOTES: 'write_concern_notes',
  VIEW_CRISIS_PLANS: 'view_crisis_plans',

  // Udvidede funktioner
  WRITE_MEDICATIONS: 'write_medications',
  APPROVE_JOURNAL: 'approve_journal',
  VIEW_PARK_PLANS: 'view_park_plans',
  EDIT_PARK_PLANS: 'edit_park_plans',

  // Ledelsesfunktioner
  MANAGE_SHIFTS: 'manage_shifts',
  VIEW_SALARY_ESTIMATE: 'view_salary_estimate',
  INVITE_STAFF: 'invite_staff',
  MANAGE_ROLES: 'manage_roles',
  IMPORT_RESIDENTS: 'import_residents',
  VIEW_AUDIT_LOG: 'view_audit_log',
  MANAGE_RESIDENTS: 'manage_residents',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  leder: Object.values(PERMISSIONS),
  medarbejder: [
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
    'view_park_plans',
  ],
  gæst: ['view_dashboard', 'view_residents', 'view_journal', 'view_handover', 'view_messages'],
};

export const BUILTIN_ROLE_NAMES = ['leder', 'medarbejder', 'gæst'] as const;

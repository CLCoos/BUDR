import { PERMISSIONS, type Permission } from '@/lib/permissions';

export const PERMISSION_LABELS: Record<Permission, { label: string; description: string }> = {
  [PERMISSIONS.VIEW_DASHBOARD]: { label: 'Se dashboard', description: 'Adgang til forsiden' },
  [PERMISSIONS.VIEW_RESIDENTS]: {
    label: 'Se beboere',
    description: 'Se beboeroversigt og profiler',
  },
  [PERMISSIONS.WRITE_JOURNAL]: {
    label: 'Skriv journal',
    description: 'Opret og redigér journalnotater',
  },
  [PERMISSIONS.VIEW_JOURNAL]: { label: 'Se journal', description: 'Læs journalnotater' },
  [PERMISSIONS.VIEW_360]: { label: 'Se 360°', description: 'Åbn 360-overblik for beboere' },
  [PERMISSIONS.WRITE_HANDOVER]: {
    label: 'Skriv overlevering',
    description: 'Opret overleveringsnoter',
  },
  [PERMISSIONS.VIEW_HANDOVER]: { label: 'Se overlevering', description: 'Læs vagtoverlevering' },
  [PERMISSIONS.SEND_MESSAGES]: { label: 'Send beskeder', description: 'Send beskeder til teamet' },
  [PERMISSIONS.VIEW_MESSAGES]: { label: 'Se beskeder', description: 'Læs indgående beskeder' },
  [PERMISSIONS.VIEW_MEDICATIONS]: { label: 'Se medicin', description: 'Læs medicinoversigt' },
  [PERMISSIONS.VIEW_CONCERN_NOTES]: {
    label: 'Se bekymringsnotater',
    description: 'Læs bekymringsnotater',
  },
  [PERMISSIONS.WRITE_CONCERN_NOTES]: {
    label: 'Skriv bekymringsnotater',
    description: 'Opret og redigér bekymringsnotater',
  },
  [PERMISSIONS.VIEW_CRISIS_PLANS]: { label: 'Se kriseplaner', description: 'Læs kriseplaner' },
  [PERMISSIONS.WRITE_MEDICATIONS]: {
    label: 'Håndtér medicin',
    description: 'Opret og redigér medicinliste',
  },
  [PERMISSIONS.APPROVE_JOURNAL]: {
    label: 'Godkend journal',
    description: 'Godkend kladder fra kolleger',
  },
  [PERMISSIONS.VIEW_PARK_PLANS]: {
    label: 'Se park-planer',
    description: 'Læs borgerens planforslag',
  },
  [PERMISSIONS.EDIT_PARK_PLANS]: {
    label: 'Redigér park-planer',
    description: 'Tilpas planforslag',
  },
  [PERMISSIONS.MANAGE_SHIFTS]: {
    label: 'Vagtplanlægning',
    description: 'Tilføj og fjern vagter',
  },
  [PERMISSIONS.VIEW_SALARY_ESTIMATE]: {
    label: 'Se lønestimat',
    description: 'Se lønberegning på vagtplan',
  },
  [PERMISSIONS.INVITE_STAFF]: {
    label: 'Invitér personale',
    description: 'Send invitationer til nye kolleger',
  },
  [PERMISSIONS.MANAGE_ROLES]: {
    label: 'Administrér roller',
    description: 'Opret og redigér roller og rettigheder',
  },
  [PERMISSIONS.IMPORT_RESIDENTS]: {
    label: 'Importér beboere',
    description: 'Upload beboere via CSV',
  },
  [PERMISSIONS.VIEW_AUDIT_LOG]: { label: 'Se audit-log', description: 'Læs systemets audit-log' },
  [PERMISSIONS.MANAGE_RESIDENTS]: {
    label: 'Administrér beboere',
    description: 'Opret og vedligehold beboerdata',
  },
};

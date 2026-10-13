/**
 * `care_staff.role` er en grov rolle med DB-CHECK (`leder` | `medarbejder`).
 * De reelle rettigheder kommer fra `care_staff.role_id` → `org_roles.permissions`.
 */
export type CareStaffRole = 'leder' | 'medarbejder';

/** Oversætter et `org_roles.name` (system eller egen rolle) til en CHECK-sikker grov rolle. */
export function coarseCareStaffRole(orgRoleName: string): CareStaffRole {
  return orgRoleName.trim().toLowerCase() === 'leder' ? 'leder' : 'medarbejder';
}

/** Standardvalg i invitér-dropdown: medarbejder, så gæst/leder er bevidste valg. */
export function preferredInviteRoleId(roles: { id: string; name: string }[]): string {
  const staff = roles.find((r) => r.name.trim().toLowerCase() === 'medarbejder');
  return staff?.id ?? roles[0]?.id ?? '';
}

/** Navn til `care_staff.full_name` (NOT NULL) ud fra auth-brugeren. */
export function careStaffFullName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string {
  const meta = user.user_metadata ?? {};
  for (const key of ['display_name', 'full_name']) {
    const v = meta[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const local = user.email?.split('@')[0]?.trim();
  return local || 'Medarbejder';
}

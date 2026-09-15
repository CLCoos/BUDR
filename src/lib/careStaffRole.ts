/** Coarse `care_staff.role` values allowed by the table CHECK constraint. */
export const CARE_STAFF_ROLES = ['leder', 'medarbejder', 'gæst'] as const;
export type CareStaffRole = (typeof CARE_STAFF_ROLES)[number];

/**
 * Map an `org_roles.name` (system or custom) to a CHECK-safe `care_staff.role`.
 * Fine-grained access still comes from `care_staff.role_id` → `org_roles.permissions`.
 */
export function careStaffRoleFromOrgRoleName(name: string): CareStaffRole {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'leder') return 'leder';
  if (normalized === 'gæst' || normalized === 'gaest') return 'gæst';
  return 'medarbejder';
}

/** Prefer medarbejder as the invite dropdown default so gæst/leder are explicit choices. */
export function preferredInviteRoleId(roles: ReadonlyArray<{ id: string; name: string }>): string {
  const medarbejder = roles.find((r) => r.name.trim().toLowerCase() === 'medarbejder');
  return medarbejder?.id ?? roles[0]?.id ?? '';
}

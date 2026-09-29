/** Coarse `care_staff.role` values allowed by `care_staff_role_check` on the live schema. */
export type CoarseCareStaffRole = 'leder' | 'medarbejder';

/**
 * Map an `org_roles.name` onto the CHECK-safe column.
 * Fine-grained access stays on `care_staff.role_id` → `org_roles.permissions`.
 * `gæst` and custom names are not legal in the CHECK (`leder` | `medarbejder` only).
 */
export function coarseCareStaffRole(orgRoleName: string): CoarseCareStaffRole {
  return orgRoleName.trim().toLowerCase() === 'leder' ? 'leder' : 'medarbejder';
}

export function careStaffFullName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string {
  const meta = user.user_metadata ?? {};
  const display = typeof meta.display_name === 'string' ? meta.display_name.trim() : '';
  if (display) return display;
  const full = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  if (full) return full;
  const local = user.email?.split('@')[0]?.trim() ?? '';
  if (local) return local;
  return 'Medarbejder';
}

export type CareStaffAttachWrite = {
  op: 'insert' | 'update';
  row: Record<string, string>;
};

/**
 * Build the `care_staff` write for BUDR Admin “Tilknyt bruger”.
 * Inserts must include `full_name` (NOT NULL, no default). Updates must not
 * clear an existing name. `role` is never the raw org-role name.
 */
export function buildCareStaffAttachWrite(args: {
  userId: string;
  orgId: string;
  roleId: string;
  orgRoleName: string;
  existing: boolean;
  authUser: { email?: string | null; user_metadata?: Record<string, unknown> | null };
}): CareStaffAttachWrite {
  const role = coarseCareStaffRole(args.orgRoleName);
  if (!args.existing) {
    return {
      op: 'insert',
      row: {
        id: args.userId,
        org_id: args.orgId,
        role_id: args.roleId,
        role,
        full_name: careStaffFullName(args.authUser),
      },
    };
  }
  return {
    op: 'update',
    row: {
      org_id: args.orgId,
      role_id: args.roleId,
      role,
    },
  };
}

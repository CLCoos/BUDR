/**
 * Pure guards for resident PIN-set authorization.
 * Edge function `resident-pin-set` must mirror these checks (Deno cannot import this module).
 */

export function staffMaySetResidentPin(args: {
  staffOrgId: string | null | undefined;
  residentOrgId: string | null | undefined;
}): boolean {
  const staffOrg = typeof args.staffOrgId === 'string' ? args.staffOrgId.trim() : '';
  const residentOrg = typeof args.residentOrgId === 'string' ? args.residentOrgId.trim() : '';
  if (!staffOrg || !residentOrg) return false;
  return staffOrg === residentOrg;
}

/** WebAuthn verify must cryptographically verify the assertion — counter alone is not enough. */
export function isWebAuthnCounterOnlyProofAcceptable(): boolean {
  return false;
}

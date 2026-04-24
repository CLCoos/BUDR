const ALLOWED_EMAIL = 'christian@budrcare.dk';

/**
 * Adgang til design-system-showcase: fast e-mail eller offentlig preview-flag.
 * Bruges af `/design-system` (staff-login + allowlist).
 */
export function canAccessDesignSystemPage(email: string | undefined): boolean {
  const flag = process.env.NEXT_PUBLIC_DESIGN_SYSTEM_ENABLED?.trim();
  if (flag === 'true') return true;
  const normalized = email?.trim().toLowerCase();
  return normalized === ALLOWED_EMAIL;
}

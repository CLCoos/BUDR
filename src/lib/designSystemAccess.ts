const ALLOWED_EMAIL = 'christian@budrcare.dk';

/**
 * Adgang til design-system-showcase: fast e-mail eller offentlig preview-flag.
 * Bruges af `/design-system` (staff-login + allowlist).
 */
export function canAccessDesignSystemPage(email: string | undefined): boolean {
  if (process.env.NODE_ENV !== 'production') return true;

  const flag = process.env.NEXT_PUBLIC_DESIGN_SYSTEM_ENABLED?.trim();
  const legacyFlag = process.env.NEXT_PUBLIC_DESIGN_SYSTEM_ACCESS?.trim().toLowerCase();
  if (flag === 'true' || legacyFlag === 'true' || legacyFlag === '1' || legacyFlag === 'yes')
    return true;

  const normalized = email?.trim().toLowerCase();
  return normalized === ALLOWED_EMAIL;
}

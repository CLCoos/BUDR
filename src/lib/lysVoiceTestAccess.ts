const ALLOWED_EMAILS = new Set(
  ['christian@budrcare.dk', 'christiancloos@outlook.com'].map((e) => e.toLowerCase())
);

/**
 * Intern stemme-test (`/lys-voice-test`): staff-login + allowlist, eller offentligt flag.
 */
export function canAccessLysVoiceTestPage(email: string | undefined): boolean {
  if (process.env.NODE_ENV !== 'production') return true;

  const flag = process.env.NEXT_PUBLIC_VOICE_TEST_ENABLED?.trim().toLowerCase();
  if (flag === 'true' || flag === '1' || flag === 'yes') return true;

  const normalized = email?.trim().toLowerCase();
  return !!normalized && ALLOWED_EMAILS.has(normalized);
}

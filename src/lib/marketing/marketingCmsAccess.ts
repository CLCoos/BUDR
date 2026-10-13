/**
 * Institutions-CMS styrer BUDR's offentlige website og må kun redigeres af BUDR selv,
 * ikke af personale hos kunderne. Redaktører angives i `BUDR_MARKETING_EDITOR_EMAILS`
 * (kommasepareret). Uden variablen kan ingen redigere.
 */
export function canEditMarketingCms(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.BUDR_MARKETING_EDITOR_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

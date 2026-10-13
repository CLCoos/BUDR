/**
 * Autentificeret Care Portal med demo-lignende widgets (simuleret indhold), mens
 * organisation og personale-login er rigtige.
 *
 * - Kun i development; i produktion altid slået fra.
 * - `false` / `0` slår fra.
 * - Uden værdi: **kun i development** defaults til true (hurtig parity med demo).
 */
export function carePortalPilotSimulatedData(): boolean {
  // Den rigtige portal viser aldrig opdigtede data i produktion; salgsdemoen ligger på /care-portal-demo.
  if (process.env.NODE_ENV === 'production') return false;
  const v = process.env.NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA;
  return v !== 'false' && v !== '0';
}

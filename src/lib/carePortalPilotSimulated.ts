/**
 * Autentificeret Care Portal med demo-lignende widgets (simuleret indhold), mens
 * organisation og personale-login er rigtige.
 *
 * - Sæt `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA=true` på fx Netlify under pilot.
 * - `false` / `0` slår fra.
 * - Uden værdi: **kun i development** defaults til true (hurtig parity med demo).
 */
export function carePortalPilotSimulatedData(): boolean {
  const v = process.env.NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA;
  if (v === 'false' || v === '0') return false;
  if (v === 'true' || v === '1') return true;
  return process.env.NODE_ENV !== 'production';
}

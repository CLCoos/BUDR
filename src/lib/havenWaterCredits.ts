/**
 * Vand til Min have tjenes ved at fuldføre opgaver på "Din dag" — ikke ubegrænset tryk.
 * Banken ligger i localStorage (per browser); samme nøgle uanset Supabase/local lagring af haven.
 */

const STORAGE_KEY = 'budr_haven_water_bank_v1';

export const HAVEN_WATER_CREDITS_EVENT = 'budr-haven-water-credits-changed';

function readBank(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeBank(b: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
  window.dispatchEvent(new CustomEvent(HAVEN_WATER_CREDITS_EVENT));
}

export function getWaterCredits(residentId: string): number {
  if (!residentId) return 0;
  const n = readBank()[residentId];
  return typeof n === 'number' && n >= 0 ? Math.floor(n) : 0;
}

/** Kald når en dag-opgave markeres som fuldført (én gang per opgave). */
export function grantWaterCredit(residentId: string): void {
  if (!residentId) return;
  const b = readBank();
  const cur = b[residentId] ?? 0;
  b[residentId] = cur + 1;
  writeBank(b);
}

/** Kald når en opgave afmarkeres — fjerner højst én "tjeneste", ikke under 0. */
export function revokeWaterCredit(residentId: string): void {
  if (!residentId) return;
  const b = readBank();
  const cur = b[residentId] ?? 0;
  b[residentId] = Math.max(0, cur - 1);
  writeBank(b);
}

/** Forbrug ét vand ved bekræftet vanding. */
export function consumeWaterCredit(residentId: string): boolean {
  if (!residentId) return false;
  const b = readBank();
  const cur = b[residentId] ?? 0;
  if (cur < 1) return false;
  b[residentId] = cur - 1;
  writeBank(b);
  return true;
}

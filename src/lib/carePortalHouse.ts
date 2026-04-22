import { CARE_HOUSES, type CareHouse } from '@/lib/careDemoResidents';

const HOUSE_SET = new Set<string>(CARE_HOUSES);

export type CarePortalDepartment = 'alle' | CareHouse;

/** Mapper onboarding `house` (fx "Hus C", "C", "TLS") til CareHouse. */
export function onboardingHouseToCareHouse(raw: unknown): CareHouse {
  const s = String(raw ?? '').trim();
  const u = s.toUpperCase();
  if (u === 'TLS') return 'TLS';
  const m = s.match(/hus\s*([ABCD])/i);
  if (m?.[1]) return m[1].toUpperCase() as CareHouse;
  if (u === 'A' || u === 'B' || u === 'C' || u === 'D') return u;
  return 'A';
}

export function isCareHouse(value: string): value is CareHouse {
  return HOUSE_SET.has(value);
}

export function parseCarePortalDepartment(value: string): CarePortalDepartment {
  if (value === 'alle' || value === '') return 'alle';
  if (isCareHouse(value)) return value;
  return 'alle';
}

/**
 * Tolker valgfri staff-metadata (fx Supabase `user_metadata.work_house`).
 * Returnerer `null` hvis feltet mangler eller ikke kan genkendes.
 */
export function parseStaffWorkHouseMetadata(raw: unknown): CarePortalDepartment | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s === 'alle' || s.toLowerCase() === 'all') return 'alle';
  if (isCareHouse(s)) return s;
  const u = s.toUpperCase();
  if (u === 'TLS') return 'TLS';
  const m = s.match(/hus\s*([ABCD])/i);
  if (m?.[1]) return m[1].toUpperCase() as CareHouse;
  if (u === 'A' || u === 'B' || u === 'C' || u === 'D') return u;
  return null;
}

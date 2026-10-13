import { RECOVERY_PROFILE_FIELDS, type LysRecoveryProfileFieldKey } from '@/types/lys';

export const RECOVERY_PROFILE_TEXT_MAX = 2000;

const FIELD_KEYS = new Set<string>(RECOVERY_PROFILE_FIELDS.map((f) => f.key));

/**
 * Tager kun kendte profilfelter med tekst (eller null). Ukendte nøgler ignoreres, så borgeren
 * ikke kan sætte resident_id, org_id, version osv. Returnerer fejl ved for lang tekst.
 */
export function parseRecoveryProfileBody(
  raw: unknown
): { fields: Partial<Record<LysRecoveryProfileFieldKey, string | null>> } | { error: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { error: 'invalid_body' };
  }
  const fields: Partial<Record<LysRecoveryProfileFieldKey, string | null>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!FIELD_KEYS.has(key)) continue;
    if (value === null) {
      fields[key as LysRecoveryProfileFieldKey] = null;
      continue;
    }
    if (typeof value !== 'string') return { error: `invalid_${key}` };
    if (value.length > RECOVERY_PROFILE_TEXT_MAX) return { error: `too_long_${key}` };
    fields[key as LysRecoveryProfileFieldKey] = value;
  }
  return { fields };
}

import { RECOVERY_PROFILE_FIELDS, type LysRecoveryProfileFieldKey } from '@/types/lys';

/** Matches `lys_recovery_profile` text columns residents may write. */
export const RECOVERY_PROFILE_FIELD_KEYS: readonly LysRecoveryProfileFieldKey[] =
  RECOVERY_PROFILE_FIELDS.map((f) => f.key);

export const MAX_RECOVERY_PROFILE_FIELD_LENGTH = 2000;

export type RecoveryProfilePatch = Partial<Record<LysRecoveryProfileFieldKey, string | null>>;

const KEY_SET = new Set<string>(RECOVERY_PROFILE_FIELD_KEYS);

function sanitizeField(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_RECOVERY_PROFILE_FIELD_LENGTH);
}

/**
 * Picks only CHIME profile text fields from a JSON body.
 * Unknown keys, ids, and org/version metadata are ignored.
 */
export function parseRecoveryProfileFields(
  body: unknown
): { ok: true; fields: RecoveryProfilePatch } | { ok: false; error: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'invalid_body' };
  }

  const record = body as Record<string, unknown>;
  const fields: RecoveryProfilePatch = {};

  for (const key of Object.keys(record)) {
    if (!KEY_SET.has(key)) continue;
    const next = sanitizeField(record[key]);
    if (next === undefined) continue;
    fields[key as LysRecoveryProfileFieldKey] = next;
  }

  if (Object.keys(fields).length === 0) {
    return { ok: false, error: 'no_valid_fields' };
  }

  return { ok: true, fields };
}

import { describe, expect, it } from 'vitest';
import {
  MAX_RECOVERY_PROFILE_FIELD_LENGTH,
  parseRecoveryProfileFields,
  RECOVERY_PROFILE_FIELD_KEYS,
} from './recoveryProfileFields';

describe('parseRecoveryProfileFields', () => {
  it('accepts allowed CHIME text fields and trims them', () => {
    const parsed = parseRecoveryProfileFields({
      connectedness_people: '  min søster  ',
      hope_dreams: 'et køkkenhavebed',
    });
    expect(parsed).toEqual({
      ok: true,
      fields: {
        connectedness_people: 'min søster',
        hope_dreams: 'et køkkenhavebed',
      },
    });
  });

  it('converts blank strings to null so residents can clear a field', () => {
    const parsed = parseRecoveryProfileFields({ identity_strengths: '   ' });
    expect(parsed).toEqual({
      ok: true,
      fields: { identity_strengths: null },
    });
  });

  it('ignores id/org/version and unknown keys', () => {
    const parsed = parseRecoveryProfileFields({
      id: 'should-not-write',
      resident_id: '11111111-1111-1111-1111-111111111111',
      org_id: '22222222-2222-2222-2222-222222222222',
      version: 99,
      hack: 'nope',
      meaning_values: 'ro',
    });
    expect(parsed).toEqual({
      ok: true,
      fields: { meaning_values: 'ro' },
    });
  });

  it('rejects bodies with no writable fields', () => {
    expect(parseRecoveryProfileFields(null)).toEqual({ ok: false, error: 'invalid_body' });
    expect(parseRecoveryProfileFields([])).toEqual({ ok: false, error: 'invalid_body' });
    expect(parseRecoveryProfileFields({ resident_id: 'x' })).toEqual({
      ok: false,
      error: 'no_valid_fields',
    });
  });

  it('truncates oversized fields instead of failing the save', () => {
    const parsed = parseRecoveryProfileFields({
      empowerment_capabilities: 'x'.repeat(MAX_RECOVERY_PROFILE_FIELD_LENGTH + 50),
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.fields.empowerment_capabilities).toHaveLength(
        MAX_RECOVERY_PROFILE_FIELD_LENGTH
      );
    }
  });

  it('covers every resident-writable column', () => {
    expect(RECOVERY_PROFILE_FIELD_KEYS).toHaveLength(13);
    expect(RECOVERY_PROFILE_FIELD_KEYS).toContain('connectedness_people');
    expect(RECOVERY_PROFILE_FIELD_KEYS).toContain('empowerment_capabilities');
  });
});

import { describe, expect, it } from 'vitest';
import { isValidUuid } from './uuid';

describe('isValidUuid', () => {
  it('accepts valid UUID v4', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts valid UUID v1', () => {
    expect(isValidUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('accepts demo resident UUID', () => {
    expect(isValidUuid('21111111-1111-1111-1111-111111111111')).toBe(true);
  });

  it('rejects non-strings and invalid values', () => {
    expect(isValidUuid(null)).toBe(false);
    expect(isValidUuid(undefined)).toBe(false);
    expect(isValidUuid(42)).toBe(false);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isValidUuid('zzzz8400-e29b-41d4-a716-446655440000')).toBe(false);
  });
});

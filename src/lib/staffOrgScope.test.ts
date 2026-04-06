import { describe, expect, it } from 'vitest';
import { parseStaffOrgId } from './staffOrgScope';

describe('parseStaffOrgId', () => {
  it('accepts a valid UUID v4', () => {
    expect(parseStaffOrgId('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('rejects non-strings and invalid UUIDs', () => {
    expect(parseStaffOrgId(null)).toBeNull();
    expect(parseStaffOrgId('not-a-uuid')).toBeNull();
    expect(parseStaffOrgId('550e8400-e29b-71d4-a716-446655440000')).toBeNull(); // version 7 nibble
  });

  it('trims whitespace', () => {
    expect(parseStaffOrgId('  550e8400-e29b-41d4-a716-446655440000  ')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });
});

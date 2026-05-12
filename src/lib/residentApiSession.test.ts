import { describe, expect, it } from 'vitest';
import { isResidentSessionUuid, residentSessionMatches } from './residentApiSession';

describe('resident API session validation helpers', () => {
  it('accepts UUID-shaped resident/session ids only', () => {
    expect(isResidentSessionUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isResidentSessionUuid(' 550e8400-e29b-41d4-a716-446655440000 ')).toBe(true);
    expect(isResidentSessionUuid('demo-resident-001')).toBe(false);
    expect(isResidentSessionUuid('not-a-token')).toBe(false);
    expect(isResidentSessionUuid(null)).toBe(false);
  });

  it('requires the opaque session row to belong to the resident cookie', () => {
    const residentId = '550e8400-e29b-41d4-a716-446655440000';
    expect(residentSessionMatches(residentId, { resident_id: residentId })).toBe(true);
    expect(
      residentSessionMatches(residentId, {
        resident_id: '550e8400-e29b-41d4-a716-446655440001',
      })
    ).toBe(false);
    expect(residentSessionMatches(residentId, null)).toBe(false);
  });
});

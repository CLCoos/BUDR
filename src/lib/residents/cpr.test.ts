import { describe, expect, it } from 'vitest';
import { formatCpr, isValidCpr } from './cpr';

describe('cpr', () => {
  it('formaterer og validerer', () => {
    expect(formatCpr('0101901234')).toBe('010190-1234');
    expect(formatCpr('01019')).toBe('01019');
    expect(isValidCpr('010190-1234')).toBe(true);
    expect(isValidCpr('321390-1234')).toBe(false);
    expect(isValidCpr('01019012')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { isLysXpActivity, LYS_XP_BY_ACTIVITY } from './xp';

describe('isLysXpActivity', () => {
  it('accepts known activities', () => {
    expect(isLysXpActivity('journal')).toBe(true);
    expect(isLysXpActivity('lys_chat')).toBe(true);
  });

  it('rejects unknown or prototype keys', () => {
    expect(isLysXpActivity('haven_water')).toBe(false);
    expect(isLysXpActivity('toString')).toBe(false);
    expect(isLysXpActivity(15)).toBe(false);
  });

  it('keeps amounts server-side and small', () => {
    expect(Object.values(LYS_XP_BY_ACTIVITY).every((xp) => xp > 0 && xp <= 20)).toBe(true);
  });
});

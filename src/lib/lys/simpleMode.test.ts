import { describe, expect, it } from 'vitest';
import { eveningSavedWhere, journalSavedWhere } from './simpleMode';

describe('enkel Lys', () => {
  it('fortæller hvor dagbogen er, når Min vej er skjult', () => {
    expect(journalSavedWhere(true)).toContain('Min dagbog');
    expect(eveningSavedWhere(true)).toContain('Min dagbog');
    expect(journalSavedWhere(true)).not.toContain('Min vej');
    expect(eveningSavedWhere(true)).not.toContain('Min vej');
  });

  it('fuld Lys peger stadig på Min vej', () => {
    expect(journalSavedWhere(false)).toContain('Min vej');
    expect(eveningSavedWhere(false)).toContain('Min vej');
  });
});

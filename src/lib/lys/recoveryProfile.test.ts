import { describe, expect, it } from 'vitest';
import { parseRecoveryProfileBody, RECOVERY_PROFILE_TEXT_MAX } from './recoveryProfile';

describe('parseRecoveryProfileBody', () => {
  it('beholder kendte felter og dropper resten', () => {
    const r = parseRecoveryProfileBody({
      hope_dreams: 'Egen lejlighed',
      meaning_values: null,
      resident_id: 'x',
      org_id: 'y',
      version: 9,
    });
    expect(r).toEqual({ fields: { hope_dreams: 'Egen lejlighed', meaning_values: null } });
  });
  it('afviser for lang tekst og forkerte typer', () => {
    expect(
      parseRecoveryProfileBody({ hope_dreams: 'a'.repeat(RECOVERY_PROFILE_TEXT_MAX + 1) })
    ).toEqual({
      error: 'too_long_hope_dreams',
    });
    expect(parseRecoveryProfileBody({ hope_dreams: 3 })).toEqual({ error: 'invalid_hope_dreams' });
    expect(parseRecoveryProfileBody([])).toEqual({ error: 'invalid_body' });
  });
});

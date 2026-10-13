import { describe, expect, it } from 'vitest';
import { PRN_TEXT_MAX, isPrnMedication, normalizePrnText, parsePrnRow } from './medicationPrn';

describe('medicationPrn', () => {
  it('recognises PN medications by time group', () => {
    expect(isPrnMedication({ time_group: 'behoev' })).toBe(true);
    expect(isPrnMedication({ time_group: 'aften' })).toBe(false);
  });

  it('requires a non-blank reason and caps its length', () => {
    expect(normalizePrnText('   ')).toBeNull();
    expect(normalizePrnText('  Uro  ')).toBe('Uro');
    expect(normalizePrnText('x'.repeat(PRN_TEXT_MAX + 50))).toHaveLength(PRN_TEXT_MAX);
  });

  it('parses rows and drops incomplete ones', () => {
    const row = parsePrnRow({
      id: 'a',
      medication_id: 'm',
      given_at: '2026-10-13T08:00:00Z',
      reason: 'Uro',
      effect: null,
    });
    expect(row?.reason).toBe('Uro');
    expect(row?.effect).toBeNull();
    expect(row?.givenAt.toISOString()).toBe('2026-10-13T08:00:00.000Z');
    expect(parsePrnRow({ id: 'a', medication_id: 'm', given_at: 'nope', reason: 'x' })).toBeNull();
    expect(
      parsePrnRow({ id: 'a', medication_id: 'm', given_at: '2026-10-13T08:00:00Z' })
    ).toBeNull();
  });
});

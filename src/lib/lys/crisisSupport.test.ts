import { describe, expect, it } from 'vitest';
import {
  currentOnCallShift,
  emptyCrisisSupportPayload,
  normalizeCrisisPlan,
  normalizeFacilityContacts,
  normalizeOnCall,
} from './crisisSupport';

describe('currentOnCallShift', () => {
  it('uses Copenhagen local hour (CEST) for day/evening/night windows', () => {
    // 10:00 UTC = 12:00 CEST in August → day (06–14)
    expect(currentOnCallShift(new Date('2026-08-15T10:00:00.000Z'))).toBe('day');
    // 12:00 UTC = 14:00 CEST → evening (14–22)
    expect(currentOnCallShift(new Date('2026-08-15T12:00:00.000Z'))).toBe('evening');
    // 20:00 UTC = 22:00 CEST → night
    expect(currentOnCallShift(new Date('2026-08-15T20:00:00.000Z'))).toBe('night');
    // 04:00 UTC = 06:00 CEST → day
    expect(currentOnCallShift(new Date('2026-08-15T04:00:00.000Z'))).toBe('day');
  });

  it('uses CET in winter', () => {
    // 13:00 UTC = 14:00 CET in January → evening
    expect(currentOnCallShift(new Date('2026-01-15T13:00:00.000Z'))).toBe('evening');
    // 04:59 UTC = 05:59 CET → still night
    expect(currentOnCallShift(new Date('2026-01-15T04:59:00.000Z'))).toBe('night');
  });
});

describe('normalizeCrisisPlan', () => {
  it('returns null for empty or missing rows', () => {
    expect(normalizeCrisisPlan(null)).toBeNull();
    expect(normalizeCrisisPlan({})).toBeNull();
    expect(
      normalizeCrisisPlan({ warning_signs: [], helpful_strategies: [], steps: [] })
    ).toBeNull();
  });

  it('keeps non-empty warning signs, strategies, and steps', () => {
    expect(
      normalizeCrisisPlan({
        warning_signs: ['Uro i kroppen', '  ', 12],
        helpful_strategies: ['Gå en tur'],
        steps: [
          { icon: '🌬️', title: 'Træk vejret', description: '4-4-6' },
          { title: '  ' },
          'skip-me',
        ],
      })
    ).toEqual({
      warning_signs: ['Uro i kroppen'],
      helpful_strategies: ['Gå en tur'],
      steps: [{ icon: '🌬️', title: 'Træk vejret', description: '4-4-6' }],
    });
  });
});

describe('normalizeFacilityContacts', () => {
  it('drops rows without id, label, or phone', () => {
    expect(
      normalizeFacilityContacts([
        { id: 'c1', label: 'Vagt', phone: '12 34 56 78', available_hours: '16-23' },
        { id: 'c2', label: 'Tom', phone: '  ' },
        { label: 'Mangler id', phone: '111' },
      ])
    ).toEqual([{ id: 'c1', label: 'Vagt', phone: '12 34 56 78', available_hours: '16-23' }]);
  });
});

describe('normalizeOnCall', () => {
  it('requires a known shift and a phone number', () => {
    expect(normalizeOnCall({ id: 'o1', phone: '87654321', shift: 'evening' })).toEqual({
      id: 'o1',
      phone: '87654321',
      shift: 'evening',
    });
    expect(normalizeOnCall({ id: 'o1', phone: '87654321', shift: 'brunch' })).toBeNull();
    expect(normalizeOnCall({ id: 'o1', phone: '  ', shift: 'day' })).toBeNull();
  });
});

describe('emptyCrisisSupportPayload', () => {
  it('returns a safe empty payload for demo sessions', () => {
    expect(emptyCrisisSupportPayload({ demo: true })).toEqual({
      crisisPlan: null,
      contacts: [],
      onCall: null,
      demo: true,
    });
  });
});

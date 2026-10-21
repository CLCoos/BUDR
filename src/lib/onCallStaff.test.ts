import { describe, expect, it } from 'vitest';
import {
  assignmentMapFromRows,
  buildOnCallUpsertRow,
  copenhagenOnCallShift,
  demoSimulatedOnCallPhone,
  draftFromAssignments,
  emptyOnCallDraft,
  formatDanishPhoneDisplay,
  mergeOnCallRowsForInstant,
  normalizeDanishPhone,
  onCallRecordDate,
  onCallShiftDate,
} from './onCallStaff';

const ORG = '550e8400-e29b-41d4-a716-446655440000';
const STAFF = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('normalizeDanishPhone', () => {
  it('accepts 8 digits and +45', () => {
    expect(normalizeDanishPhone('12 34 56 78')).toBe('12345678');
    expect(normalizeDanishPhone('+45 12345678')).toBe('12345678');
    expect(normalizeDanishPhone('004512345678')).toBe('12345678');
  });

  it('rejects too-short or empty values', () => {
    expect(normalizeDanishPhone('')).toBeNull();
    expect(normalizeDanishPhone('123')).toBeNull();
    expect(normalizeDanishPhone('abc')).toBeNull();
  });
});

describe('formatDanishPhoneDisplay', () => {
  it('groups 8 digits', () => {
    expect(formatDanishPhoneDisplay('12345678')).toBe('12 34 56 78');
  });
});

describe('assignmentMapFromRows', () => {
  it('returns nulls when nothing is stored — live must not invent numbers', () => {
    const map = assignmentMapFromRows([]);
    expect(map.day).toBeNull();
    expect(map.evening).toBeNull();
    expect(map.night).toBeNull();
    expect(emptyOnCallDraft().day.phone).toBe('');
  });

  it('keeps only valid shift + uuid + 8-digit phone rows', () => {
    const map = assignmentMapFromRows([
      { shift: 'day', staff_id: STAFF, phone: '22 33 44 55' },
      { shift: 'evening', staff_id: 'not-uuid', phone: '22334455' },
      { shift: 'nope', staff_id: STAFF, phone: '22334455' },
    ]);
    expect(map.day).toEqual({ staffId: STAFF, phone: '22334455' });
    expect(map.evening).toBeNull();
    expect(map.night).toBeNull();
    expect(draftFromAssignments(map).day.phone).toBe('22 33 44 55');
  });
});

describe('buildOnCallUpsertRow', () => {
  const base = {
    orgId: ORG,
    staffId: STAFF,
    phone: '22 11 00 99',
    dateYmd: '2026-08-30',
    shift: 'night' as const,
    allowedStaffIds: [STAFF],
  };

  it('writes digits-only phone for the Copenhagen date', () => {
    const row = buildOnCallUpsertRow(base, new Date('2026-08-30T10:00:00.000Z'));
    expect(row).toMatchObject({
      org_id: ORG,
      staff_id: STAFF,
      phone: '22110099',
      date: '2026-08-30',
      shift: 'night',
    });
  });

  it('rejects staff outside the org list', () => {
    const row = buildOnCallUpsertRow({ ...base, allowedStaffIds: [] });
    expect(row).toEqual({ error: 'Medarbejderen hører ikke til organisationen' });
  });

  it('rejects missing staff instead of hashing a fake number', () => {
    const row = buildOnCallUpsertRow({ ...base, staffId: '' });
    expect(row).toEqual({ error: 'Vælg en medarbejder' });
  });
});

describe('demoSimulatedOnCallPhone', () => {
  it('looks like a real 8-digit Danish number (why live must never use it)', () => {
    const phone = demoSimulatedOnCallPhone('2026-08-30', 'day');
    expect(normalizeDanishPhone(phone)).toHaveLength(8);
    expect(phone).toMatch(/^\d{2} \d{2} \d{2} \d{2}$/);
  });
});

describe('Copenhagen shift date', () => {
  it('uses civil date in Copenhagen, not UTC ISO date', () => {
    const lateUtc = new Date('2026-08-29T22:30:00.000Z'); // 00:30 CEST 30 Aug
    expect(onCallShiftDate(lateUtc)).toBe('2026-08-30');
    expect(lateUtc.toISOString().slice(0, 10)).toBe('2026-08-29');
    expect(copenhagenOnCallShift(lateUtc)).toBe('night');
  });

  it('maps afternoon Copenhagen time to evening shift', () => {
    expect(copenhagenOnCallShift(new Date('2026-08-30T13:00:00.000Z'))).toBe('evening');
  });
});

describe('onCallRecordDate', () => {
  it('keeps the night shift on the civil day it started after midnight', () => {
    // 00:30 CEST 30 Aug — the shift that started 29 Aug 22:00 is still on duty
    const afterMidnight = new Date('2026-08-29T22:30:00.000Z');
    expect(onCallShiftDate(afterMidnight)).toBe('2026-08-30');
    expect(copenhagenOnCallShift(afterMidnight)).toBe('night');
    expect(onCallRecordDate(afterMidnight, 'night')).toBe('2026-08-29');
    expect(onCallRecordDate(afterMidnight, 'day')).toBe('2026-08-30');
  });

  it('uses the same civil date once the night shift has started in the evening', () => {
    const nightStart = new Date('2026-08-15T20:00:00.000Z'); // 22:00 CEST
    expect(onCallRecordDate(nightStart, 'night')).toBe('2026-08-15');
  });

  it('uses yesterday before 06:00 in winter, including across a month boundary', () => {
    const beforeSix = new Date('2026-01-15T04:59:00.000Z'); // 05:59 CET
    expect(onCallRecordDate(beforeSix)).toBe('2026-01-14');
    const marchFirst = new Date('2026-02-28T23:30:00.000Z'); // 00:30 CET 1 Mar
    expect(onCallRecordDate(marchFirst, 'night')).toBe('2026-02-28');
  });

  it('shows the ongoing night number, not the night that starts this evening', () => {
    const afterMidnight = new Date('2026-08-29T22:30:00.000Z');
    expect(
      mergeOnCallRowsForInstant(
        [
          { shift: 'day', phone: '11111111' },
          { shift: 'night', phone: '22222222' },
        ],
        [{ shift: 'night', phone: '33333333' }],
        afterMidnight
      )
    ).toEqual([
      { shift: 'day', phone: '11111111' },
      { shift: 'night', phone: '33333333' },
    ]);
  });

  it('leaves daytime rows unchanged', () => {
    const afternoon = new Date('2026-08-30T13:00:00.000Z'); // 15:00 CEST
    const rows = [{ shift: 'night', phone: '22222222' }];
    expect(
      mergeOnCallRowsForInstant(rows, [{ shift: 'night', phone: '33333333' }], afternoon)
    ).toEqual(rows);
  });
});

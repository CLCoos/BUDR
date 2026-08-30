import { describe, expect, it } from 'vitest';
import {
  assignmentMapFromRows,
  buildOnCallUpsertRow,
  copenhagenOnCallShift,
  demoSimulatedOnCallPhone,
  draftFromAssignments,
  emptyOnCallDraft,
  formatDanishPhoneDisplay,
  normalizeDanishPhone,
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

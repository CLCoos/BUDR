import { describe, expect, it } from 'vitest';
import {
  applyStoredNotes,
  buildHandoverUpsertRows,
  clipHandoverBody,
  HANDOVER_NOTE_MAX_CHARS,
  handoverConflictKey,
  handoverShiftDate,
  handoverShiftLabelDa,
  shouldPersistHandoverEntry,
} from './handoverNotes';

const RES_A = '550e8400-e29b-41d4-a716-446655440000';
const RES_B = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const ORG = '11111111-1111-4111-8111-111111111111';

describe('shouldPersistHandoverEntry', () => {
  it('skips blank cards', () => {
    expect(shouldPersistHandoverEntry({ note: '   ', flagColor: null })).toBe(false);
  });

  it('keeps a note or a flag', () => {
    expect(shouldPersistHandoverEntry({ note: 'Uro i nat', flagColor: null })).toBe(true);
    expect(shouldPersistHandoverEntry({ note: '', flagColor: 'roed' })).toBe(true);
  });
});

describe('buildHandoverUpsertRows', () => {
  it('omits empty residents and clips body', () => {
    const rows = buildHandoverUpsertRows({
      entries: [
        { residentId: RES_A, note: '  Sara sover nu.  ', flagColor: 'gul' },
        { residentId: RES_B, note: '   ', flagColor: null },
      ],
      orgId: ORG,
      staffId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      shiftLabel: 'nat',
      shiftDate: '2026-08-26',
      nowIso: '2026-08-26T01:15:00.000Z',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      resident_id: RES_A,
      org_id: ORG,
      flag_color: 'gul',
      shift_label: 'nat',
      shift_date: '2026-08-26',
      body: 'Sara sover nu.',
    });
    expect(handoverConflictKey(rows[0]!)).toBe(`${RES_A}|2026-08-26|nat`);
  });

  it('does not invent a flag from unknown values', () => {
    const rows = buildHandoverUpsertRows({
      entries: [{ residentId: RES_A, note: 'ok', flagColor: 'purple' }],
      orgId: ORG,
      staffId: null,
      shiftLabel: 'dag',
      shiftDate: '2026-08-26',
    });
    expect(rows[0]?.flag_color).toBeNull();
  });
});

describe('clipHandoverBody', () => {
  it('caps at HANDOVER_NOTE_MAX_CHARS', () => {
    const long = 'x'.repeat(HANDOVER_NOTE_MAX_CHARS + 50);
    expect(clipHandoverBody(long).length).toBe(HANDOVER_NOTE_MAX_CHARS);
  });
});

describe('applyStoredNotes', () => {
  it('fills current shift text and previous shift excerpt', () => {
    const applied = applyStoredNotes(
      [
        {
          residentId: RES_A,
          note: '',
          flagColor: null,
        },
      ],
      [
        {
          resident_id: RES_A,
          shift_label: 'nat',
          shift_date: '2026-08-26',
          body: 'Nat: uro kl. 02',
          flag_color: 'roed',
          created_at: '2026-08-26T00:10:00.000Z',
        },
        {
          resident_id: RES_A,
          shift_label: 'aften',
          shift_date: '2026-08-25',
          body: 'Aften: spiste og gik i seng',
          flag_color: 'gul',
          created_at: '2026-08-25T20:00:00.000Z',
        },
      ],
      { shiftDate: '2026-08-26', shiftLabel: 'nat' }
    );
    expect(applied[0]?.note).toBe('Nat: uro kl. 02');
    expect(applied[0]?.flagColor).toBe('roed');
    expect(applied[0]?.previousNote).toBe('Aften: spiste og gik i seng');
    expect(applied[0]?.previousShift).toBe('Aftenvagt · 2026-08-25');
  });

  it('matches current shift when PostgREST returns a midnight ISO date', () => {
    const applied = applyStoredNotes(
      [{ residentId: RES_A, note: '', flagColor: null }],
      [
        {
          resident_id: RES_A,
          shift_label: 'nat',
          shift_date: '2026-08-26T00:00:00.000Z',
          body: 'ISO-dato fra API',
          flag_color: 'gul',
          created_at: '2026-08-26T00:10:00.000Z',
        },
      ],
      { shiftDate: '2026-08-26', shiftLabel: 'nat' }
    );
    expect(applied[0]?.note).toBe('ISO-dato fra API');
  });

  it('does not treat the current row as previous', () => {
    const applied = applyStoredNotes(
      [{ residentId: RES_A, note: '', flagColor: null }],
      [
        {
          resident_id: RES_A,
          shift_label: 'dag',
          shift_date: '2026-08-26',
          body: 'Kun i dag',
          flag_color: 'groen',
          created_at: '2026-08-26T08:00:00.000Z',
        },
      ],
      { shiftDate: '2026-08-26', shiftLabel: 'dag' }
    );
    expect(applied[0]?.previousNote).toBeUndefined();
  });
});

describe('handoverShiftDate', () => {
  it('uses Copenhagen civil date, not UTC, before 02:00 CEST', () => {
    // 2026-08-25 23:30 UTC = 2026-08-26 01:30 in Copenhagen (summer).
    expect(handoverShiftDate(new Date('2026-08-25T23:30:00.000Z'))).toBe('2026-08-26');
  });
});

describe('handoverShiftLabelDa', () => {
  it('labels Danish shifts', () => {
    expect(handoverShiftLabelDa('nat')).toBe('Natvagt');
    expect(handoverShiftLabelDa('doegnnotat')).toBe('Døgnnotat');
  });
});

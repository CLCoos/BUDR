import { describe, expect, it } from 'vitest';
import {
  addDaysYmd,
  buildRosterSlots,
  buildStaffShiftInsertRow,
  canClaimRosterSlot,
  currentPayPeriodBounds,
  demoSimulatedAssignees,
  hoursInYmdRange,
  isShiftDateYmd,
  isShiftType,
  isWeekendYmd,
  mondayOfCopenhagenWeek,
  myUpcomingShifts,
  openSlotsOnRoster,
  parseStaffShiftRow,
  requiredStaffForSlot,
  SHIFT_META,
  type StaffShiftRow,
} from './staffShifts';

const ORG = '550e8400-e29b-41d4-a716-446655440000';
const STAFF_A = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const STAFF_B = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

function row(
  partial: Partial<StaffShiftRow> &
    Pick<StaffShiftRow, 'id' | 'staff_id' | 'shift_date' | 'shift_type'>
): StaffShiftRow {
  const meta = SHIFT_META[partial.shift_type];
  return {
    org_id: ORG,
    start_time: meta.start,
    end_time: meta.end,
    hours: meta.hours,
    location: meta.location,
    ...partial,
  };
}

describe('shift enums and dates', () => {
  it('accepts dag/aften/nat only', () => {
    expect(isShiftType('dag')).toBe(true);
    expect(isShiftType('aften')).toBe(true);
    expect(isShiftType('nat')).toBe(true);
    expect(isShiftType('day')).toBe(false);
    expect(isShiftType('vagt')).toBe(false);
  });

  it('rejects impossible calendar dates', () => {
    expect(isShiftDateYmd('2026-08-31')).toBe(true);
    expect(isShiftDateYmd('2026-02-30')).toBe(false);
    expect(isShiftDateYmd('31-08-2026')).toBe(false);
  });

  it('adds days on the civil YMD string without UTC midnight drift', () => {
    expect(addDaysYmd('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDaysYmd('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('treats Saturday/Sunday as weekend', () => {
    expect(isWeekendYmd('2026-08-29')).toBe(true); // Saturday
    expect(isWeekendYmd('2026-08-31')).toBe(false); // Monday
  });
});

describe('pay period (15th–14th, Copenhagen)', () => {
  it('uses 15th of this month when civil day is on or after the 15th', () => {
    const p = currentPayPeriodBounds(new Date('2026-08-31T11:00:00.000Z'));
    expect(p.startYmd).toBe('2026-08-15');
    expect(p.endYmd).toBe('2026-09-14');
  });

  it('does not jump to the next period around Copenhagen midnight before the 15th', () => {
    // 2026-08-14 21:59 UTC = 23:59 CEST 14 Aug — still previous period.
    const p = currentPayPeriodBounds(new Date('2026-08-14T21:59:00.000Z'));
    expect(p.startYmd).toBe('2026-07-15');
    expect(p.endYmd).toBe('2026-08-14');
  });
});

describe('insert payload', () => {
  it('rejects bad org, staff, date, type, and cross-org staff', () => {
    expect(
      buildStaffShiftInsertRow({
        orgId: 'nope',
        staffId: STAFF_A,
        shiftDateYmd: '2026-08-31',
        shiftType: 'dag',
        allowedStaffIds: [STAFF_A],
      })
    ).toEqual({ error: 'Ugyldigt organisations-id' });
    expect(
      buildStaffShiftInsertRow({
        orgId: ORG,
        staffId: STAFF_B,
        shiftDateYmd: '2026-08-31',
        shiftType: 'dag',
        allowedStaffIds: [STAFF_A],
      })
    ).toEqual({ error: 'Medarbejderen hører ikke til organisationen' });
    expect(
      buildStaffShiftInsertRow({
        orgId: ORG,
        staffId: STAFF_A,
        shiftDateYmd: '2026-02-30',
        shiftType: 'dag',
        allowedStaffIds: [STAFF_A],
      })
    ).toEqual({ error: 'Ugyldig dato' });
  });

  it('fills start/end/hours/location from SHIFT_META', () => {
    const built = buildStaffShiftInsertRow({
      orgId: ORG,
      staffId: STAFF_A,
      shiftDateYmd: '2026-08-31',
      shiftType: 'nat',
      allowedStaffIds: [STAFF_A],
    });
    expect(built).toMatchObject({
      org_id: ORG,
      staff_id: STAFF_A,
      shift_date: '2026-08-31',
      shift_type: 'nat',
      start_time: '23:00',
      end_time: '07:00',
      hours: 8,
      location: SHIFT_META.nat.location,
    });
  });
});

describe('parseStaffShiftRow', () => {
  it('drops rows without uuid ids or valid type/date', () => {
    expect(
      parseStaffShiftRow({
        id: 'x',
        org_id: ORG,
        staff_id: STAFF_A,
        shift_date: '2026-08-31',
        shift_type: 'dag',
      })
    ).toBeNull();
    expect(
      parseStaffShiftRow({
        id: STAFF_A,
        org_id: ORG,
        staff_id: STAFF_A,
        shift_date: '2026-08-31',
        shift_type: 'day',
      })
    ).toBeNull();
  });

  it('falls back to SHIFT_META when times are missing', () => {
    const parsed = parseStaffShiftRow({
      id: STAFF_A,
      org_id: ORG,
      staff_id: STAFF_B,
      shift_date: '2026-08-31T00:00:00.000Z',
      shift_type: 'aften',
      hours: '8.0',
    });
    expect(parsed).toMatchObject({
      shift_date: '2026-08-31',
      shift_type: 'aften',
      start_time: '15:00',
      end_time: '23:00',
      hours: 8,
    });
  });
});

describe('live roster (no simulated colleagues)', () => {
  it('shows empty assigned lists on live when the table is empty', () => {
    const slots = buildRosterSlots({
      dates: ['2026-08-31'],
      rows: [],
      staffNameById: new Map(),
      myStaffId: STAFF_A,
      fillSimulatedTeam: false,
    });
    const day = slots.get('2026-08-31')!;
    expect(day).toHaveLength(3);
    for (const slot of day) {
      expect(slot.assigned).toEqual([]);
      expect(slot.mine).toBe(false);
      expect(slot.myAssignmentId).toBeNull();
      expect(openSlotsOnRoster(slot)).toBe(slot.required);
      expect(canClaimRosterSlot(slot)).toBe(true);
      expect(slot.assigned.some((a) => a.staffName === 'Christian C.')).toBe(false);
    }
    expect(requiredStaffForSlot('dag', '2026-08-31')).toBe(4);
    expect(requiredStaffForSlot('dag', '2026-08-29')).toBe(3);
  });

  it('labels the current user Dig and blocks a second claim', () => {
    const slots = buildRosterSlots({
      dates: ['2026-08-31'],
      rows: [
        row({ id: STAFF_A, staff_id: STAFF_A, shift_date: '2026-08-31', shift_type: 'dag' }),
        row({ id: STAFF_B, staff_id: STAFF_B, shift_date: '2026-08-31', shift_type: 'dag' }),
      ],
      staffNameById: new Map([
        [STAFF_A, 'Anna A.'],
        [STAFF_B, 'Bo B.'],
      ]),
      myStaffId: STAFF_A,
      fillSimulatedTeam: false,
    });
    const dag = slots.get('2026-08-31')!.find((s) => s.type === 'dag')!;
    expect(dag.assigned.map((a) => a.staffName)).toEqual(['Dig', 'Bo B.']);
    expect(dag.mine).toBe(true);
    expect(canClaimRosterSlot(dag)).toBe(false);
    expect(openSlotsOnRoster(dag)).toBe(2);
  });

  it('never leaks demo hash names into live occupancy', () => {
    const live = buildRosterSlots({
      dates: ['2026-08-31'],
      rows: [],
      staffNameById: new Map(),
      myStaffId: STAFF_A,
      fillSimulatedTeam: false,
    });
    const demo = demoSimulatedAssignees('2026-08-31', 'dag', 4, false);
    expect(live.get('2026-08-31')![0]!.assigned).toHaveLength(0);
    expect(demo.length).toBeGreaterThan(0);
    expect(demo.every((a) => a.staffId.startsWith('demo-'))).toBe(true);
    expect(demo.some((a) => a.staffName === 'Dig')).toBe(false);
  });
});

describe('hours and upcoming', () => {
  it('counts only my rows in the week window', () => {
    const rows = [
      row({ id: STAFF_A, staff_id: STAFF_A, shift_date: '2026-08-31', shift_type: 'dag' }),
      row({ id: STAFF_B, staff_id: STAFF_B, shift_date: '2026-08-31', shift_type: 'dag' }),
      row({
        id: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
        staff_id: STAFF_A,
        shift_date: '2026-09-07',
        shift_type: 'aften',
      }),
    ];
    expect(hoursInYmdRange(rows, STAFF_A, '2026-08-31', '2026-09-06')).toBe(8);
    expect(myUpcomingShifts(rows, STAFF_A, '2026-08-31').map((r) => r.shift_date)).toEqual([
      '2026-08-31',
      '2026-09-07',
    ]);
  });

  it('mondayOfCopenhagenWeek is Monday of the civil week', () => {
    // Wednesday 2026-09-02 10:00 UTC = 12:00 CEST
    expect(mondayOfCopenhagenWeek(new Date('2026-09-02T10:00:00.000Z'))).toBe('2026-08-31');
  });
});

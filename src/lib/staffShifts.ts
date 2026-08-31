import { copenhagenYmd } from '@/lib/copenhagenDay';
import { isValidUuid } from '@/lib/uuid';
import { VAGTPLAN_CORE_SHIFT_LOCATIONS } from '@/lib/vagtplanInferDepartment';

export const SHIFT_TYPES = ['dag', 'aften', 'nat'] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_RE = /^\d{2}:\d{2}$/;

export type ShiftMeta = {
  start: string;
  end: string;
  hours: number;
  location: string;
  weekday: number;
  weekend: number;
};

/** Standard bemandingsmål pr. kernevagt (ikke fiktiv belægning). */
export const SHIFT_META: Record<ShiftType, ShiftMeta> = {
  dag: {
    start: '07:30',
    end: '15:30',
    hours: 8,
    location: VAGTPLAN_CORE_SHIFT_LOCATIONS.dag,
    weekday: 4,
    weekend: 3,
  },
  aften: {
    start: '15:00',
    end: '23:00',
    hours: 8,
    location: VAGTPLAN_CORE_SHIFT_LOCATIONS.aften,
    weekday: 3,
    weekend: 3,
  },
  nat: {
    start: '23:00',
    end: '07:00',
    hours: 8,
    location: VAGTPLAN_CORE_SHIFT_LOCATIONS.nat,
    weekday: 2,
    weekend: 2,
  },
};

export type StaffShiftRow = {
  id: string;
  org_id: string;
  staff_id: string;
  shift_date: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  hours: number;
  location: string;
};

export type StaffShiftInsertInput = {
  orgId: string;
  staffId: string;
  shiftDateYmd: string;
  shiftType: ShiftType;
  allowedStaffIds: string[];
};

export type RosterAssignee = {
  staffId: string;
  staffName: string;
  assignmentId: string | null;
  start: string;
  end: string;
  hours: number;
};

export type RosterSlot = {
  id: string;
  date: string;
  type: ShiftType;
  start: string;
  end: string;
  hours: number;
  location: string;
  assigned: RosterAssignee[];
  required: number;
  mine: boolean;
  myAssignmentId: string | null;
};

export function isShiftType(value: unknown): value is ShiftType {
  return value === 'dag' || value === 'aften' || value === 'nat';
}

export function isShiftDateYmd(value: unknown): value is string {
  if (typeof value !== 'string' || !YMD_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function addDaysYmd(ymd: string, delta: number): string {
  if (!isShiftDateYmd(ymd)) return ymd;
  const dt = new Date(`${ymd}T12:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

export function isWeekendYmd(ymd: string): boolean {
  if (!isShiftDateYmd(ymd)) return false;
  const day = new Date(`${ymd}T12:00:00.000Z`).getUTCDay();
  return day === 0 || day === 6;
}

export function requiredStaffForSlot(type: ShiftType, dateYmd: string): number {
  const meta = SHIFT_META[type];
  return isWeekendYmd(dateYmd) ? meta.weekend : meta.weekday;
}

export function openSlotsOnRoster(slot: Pick<RosterSlot, 'required' | 'assigned'>): number {
  return Math.max(0, slot.required - slot.assigned.length);
}

export function canClaimRosterSlot(
  slot: Pick<RosterSlot, 'required' | 'assigned' | 'mine'>
): boolean {
  return !slot.mine && openSlotsOnRoster(slot) > 0;
}

/** Civil pay period 15th–14th in Europe/Copenhagen (not UTC ISO date). */
export function currentPayPeriodBounds(ref = new Date()): {
  startYmd: string;
  endYmd: string;
  label: string;
} {
  const ymd = copenhagenYmd(ref);
  const [year, month, day] = ymd.split('-').map(Number) as [number, number, number];
  let startYear = year;
  let startMonth = month;
  let endYear = year;
  let endMonth = month;
  if (day >= 15) {
    endMonth = month === 12 ? 1 : month + 1;
    endYear = month === 12 ? year + 1 : year;
  } else {
    startMonth = month === 1 ? 12 : month - 1;
    startYear = month === 1 ? year - 1 : year;
  }
  const startYmd = `${startYear}-${String(startMonth).padStart(2, '0')}-15`;
  const endYmd = `${endYear}-${String(endMonth).padStart(2, '0')}-14`;
  const fmt = (value: string) =>
    new Date(`${value}T12:00:00.000Z`).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  return { startYmd, endYmd, label: `${fmt(startYmd)} — ${fmt(endYmd)}` };
}

export function shiftsInYmdRange<T extends { date: string }>(
  shifts: T[],
  startYmd: string,
  endYmd: string
): T[] {
  return shifts.filter((s) => s.date >= startYmd && s.date <= endYmd);
}

export function mondayOfCopenhagenWeek(ref = new Date()): string {
  const today = copenhagenYmd(ref);
  const dow = new Date(`${today}T12:00:00.000Z`).getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  return addDaysYmd(today, delta);
}

export type StaffShiftInsertRow = {
  org_id: string;
  staff_id: string;
  shift_date: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  hours: number;
  location: string;
};

export function buildStaffShiftInsertRow(
  input: StaffShiftInsertInput
): StaffShiftInsertRow | { error: string } {
  if (!isValidUuid(input.orgId)) return { error: 'Ugyldigt organisations-id' };
  if (!isValidUuid(input.staffId)) return { error: 'Log ind for at tage en vagt' };
  if (!input.allowedStaffIds.includes(input.staffId)) {
    return { error: 'Medarbejderen hører ikke til organisationen' };
  }
  if (!isShiftDateYmd(input.shiftDateYmd)) return { error: 'Ugyldig dato' };
  if (!isShiftType(input.shiftType)) return { error: 'Ugyldigt skift' };
  const meta = SHIFT_META[input.shiftType];
  return {
    org_id: input.orgId,
    staff_id: input.staffId,
    shift_date: input.shiftDateYmd,
    shift_type: input.shiftType,
    start_time: meta.start,
    end_time: meta.end,
    hours: meta.hours,
    location: meta.location,
  };
}

function isHhMm(value: unknown): value is string {
  return typeof value === 'string' && HHMM_RE.test(value);
}

/** PostgREST `numeric` often arrives as a string. */
function parseHours(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0 && n <= 24) return n;
  }
  return fallback;
}

export function parseStaffShiftRow(row: Record<string, unknown>): StaffShiftRow | null {
  const id = typeof row.id === 'string' ? row.id : null;
  const orgId = typeof row.org_id === 'string' ? row.org_id : null;
  const staffId = typeof row.staff_id === 'string' ? row.staff_id : null;
  const shiftDate = typeof row.shift_date === 'string' ? row.shift_date.slice(0, 10) : '';
  if (!id || !isValidUuid(id) || !orgId || !isValidUuid(orgId)) return null;
  if (!staffId || !isValidUuid(staffId) || !isShiftDateYmd(shiftDate)) return null;
  if (!isShiftType(row.shift_type)) return null;
  const meta = SHIFT_META[row.shift_type];
  const start = isHhMm(row.start_time) ? row.start_time : meta.start;
  const end = isHhMm(row.end_time) ? row.end_time : meta.end;
  const hours = parseHours(row.hours, meta.hours);
  const location =
    typeof row.location === 'string' && row.location.trim() ? row.location.trim() : meta.location;
  return {
    id,
    org_id: orgId,
    staff_id: staffId,
    shift_date: shiftDate,
    shift_type: row.shift_type,
    start_time: start,
    end_time: end,
    hours,
    location,
  };
}

const DEMO_TEAM = ['Christian C.', 'Mette R.', 'Anders K.', 'Louise N.', 'Helle T.', 'Nicolai S.'];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 33 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Demo-only occupancy. Must never run on the live Care Portal path. */
export function demoSimulatedAssignees(
  dateYmd: string,
  type: ShiftType,
  required: number,
  mine: boolean
): RosterAssignee[] {
  const seed = hashSeed(`${dateYmd}:${type}`);
  const assignedCount = mine ? required : Math.max(0, required - (seed % 2));
  const assigned: RosterAssignee[] = mine
    ? [
        {
          staffId: 'demo-self',
          staffName: 'Dig',
          assignmentId: `demo-${dateYmd}-${type}`,
          start: SHIFT_META[type].start,
          end: SHIFT_META[type].end,
          hours: SHIFT_META[type].hours,
        },
      ]
    : [];
  let i = 0;
  while (assigned.length < assignedCount) {
    const name = DEMO_TEAM[(seed + i) % DEMO_TEAM.length]!;
    if (!assigned.some((a) => a.staffName === name)) {
      assigned.push({
        staffId: `demo-${name}`,
        staffName: name,
        assignmentId: null,
        start: SHIFT_META[type].start,
        end: SHIFT_META[type].end,
        hours: SHIFT_META[type].hours,
      });
    }
    i += 1;
    if (i > 20) break;
  }
  return assigned;
}

export function buildRosterSlots(input: {
  dates: string[];
  rows: StaffShiftRow[];
  staffNameById: Map<string, string>;
  myStaffId: string | null;
  /** Invent hashed demo names. Live must pass false. */
  fillSimulatedTeam: boolean;
}): Map<string, RosterSlot[]> {
  const byDateType = new Map<string, StaffShiftRow[]>();
  for (const row of input.rows) {
    const key = `${row.shift_date}:${row.shift_type}`;
    const list = byDateType.get(key) ?? [];
    list.push(row);
    byDateType.set(key, list);
  }

  const result = new Map<string, RosterSlot[]>();
  for (const date of input.dates) {
    const slots: RosterSlot[] = SHIFT_TYPES.map((type) => {
      const meta = SHIFT_META[type];
      const required = requiredStaffForSlot(type, date);
      const rows = byDateType.get(`${date}:${type}`) ?? [];
      const assigned: RosterAssignee[] = rows.map((row) => ({
        staffId: row.staff_id,
        staffName:
          input.myStaffId && row.staff_id === input.myStaffId
            ? 'Dig'
            : (input.staffNameById.get(row.staff_id) ?? 'Kollega'),
        assignmentId: row.id,
        start: row.start_time,
        end: row.end_time,
        hours: row.hours,
      }));
      const mine = Boolean(input.myStaffId && assigned.some((a) => a.staffId === input.myStaffId));
      const displayAssigned = input.fillSimulatedTeam
        ? demoSimulatedAssignees(date, type, required, mine)
        : assigned;
      const mineRow = rows.find((r) => r.staff_id === input.myStaffId);
      return {
        id: `${date}-${type}`,
        date,
        type,
        start: mineRow?.start_time ?? meta.start,
        end: mineRow?.end_time ?? meta.end,
        hours: mineRow?.hours ?? meta.hours,
        location: meta.location,
        assigned: displayAssigned,
        required,
        mine,
        myAssignmentId: mineRow?.id ?? null,
      };
    });
    result.set(date, slots);
  }
  return result;
}

export function myUpcomingShifts(
  rows: StaffShiftRow[],
  myStaffId: string,
  todayYmd: string
): StaffShiftRow[] {
  return rows
    .filter((r) => r.staff_id === myStaffId && r.shift_date >= todayYmd)
    .sort(
      (a, b) => a.shift_date.localeCompare(b.shift_date) || a.start_time.localeCompare(b.start_time)
    );
}

export function hoursInYmdRange(
  rows: StaffShiftRow[],
  myStaffId: string,
  startYmd: string,
  endYmd: string
): number {
  return rows
    .filter((r) => r.staff_id === myStaffId && r.shift_date >= startYmd && r.shift_date <= endYmd)
    .reduce((acc, r) => acc + r.hours, 0);
}

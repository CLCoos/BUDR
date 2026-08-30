import { copenhagenHour, copenhagenYmd } from '@/lib/copenhagenDay';
import { isValidUuid } from '@/lib/uuid';

export type OnCallShiftKey = 'day' | 'evening' | 'night';

export const ON_CALL_SHIFT_KEYS: OnCallShiftKey[] = ['day', 'evening', 'night'];

export const ON_CALL_SHIFT_LABELS: Record<OnCallShiftKey, string> = {
  day: 'Dag (06:00-14:00)',
  evening: 'Aften (14:00-22:00)',
  night: 'Nat (22:00-06:00)',
};

export type OnCallStaffOption = {
  id: string;
  fullName: string;
};

export type OnCallAssignment = {
  staffId: string;
  phone: string;
};

export type OnCallDraft = Record<OnCallShiftKey, { staffId: string; phone: string }>;

export function emptyOnCallDraft(): OnCallDraft {
  return {
    day: { staffId: '', phone: '' },
    evening: { staffId: '', phone: '' },
    night: { staffId: '', phone: '' },
  };
}

export function isOnCallShiftKey(value: unknown): value is OnCallShiftKey {
  return value === 'day' || value === 'evening' || value === 'night';
}

/** Copenhagen civil date used for `on_call_staff.date` (not UTC ISO date). */
export function onCallShiftDate(ref = new Date()): string {
  return copenhagenYmd(ref);
}

export function copenhagenOnCallShift(ref = new Date()): OnCallShiftKey {
  const hour = copenhagenHour(ref);
  if (hour >= 6 && hour < 14) return 'day';
  if (hour >= 14 && hour < 22) return 'evening';
  return 'night';
}

/** 8-digit Danish number, optionally with +45 / 0045. */
export function normalizeDanishPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) return digits;
  if (digits.length === 10 && digits.startsWith('45')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('045')) return digits.slice(3);
  if (digits.length === 12 && digits.startsWith('0045')) return digits.slice(4);
  return null;
}

export function formatDanishPhoneDisplay(raw: string): string {
  const digits = normalizeDanishPhone(raw) ?? raw.replace(/\D/g, '');
  if (digits.length !== 8) return raw.trim();
  return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`;
}

export type OnCallUpsertRow = {
  org_id: string;
  staff_id: string;
  phone: string;
  date: string;
  shift: OnCallShiftKey;
  updated_at: string;
};

export type OnCallUpsertInput = {
  orgId: string;
  staffId: string;
  phone: string;
  dateYmd: string;
  shift: OnCallShiftKey;
  allowedStaffIds: string[];
};

export function buildOnCallUpsertRow(
  input: OnCallUpsertInput,
  now = new Date()
): OnCallUpsertRow | { error: string } {
  if (!isValidUuid(input.orgId)) return { error: 'Ugyldigt organisations-id' };
  if (!isValidUuid(input.staffId)) return { error: 'Vælg en medarbejder' };
  if (!input.allowedStaffIds.includes(input.staffId)) {
    return { error: 'Medarbejderen hører ikke til organisationen' };
  }
  const phone = normalizeDanishPhone(input.phone);
  if (!phone) return { error: 'Telefon skal være et dansk 8-cifret nummer' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateYmd)) return { error: 'Ugyldig dato' };
  if (!isOnCallShiftKey(input.shift)) return { error: 'Ugyldigt skift' };
  return {
    org_id: input.orgId,
    staff_id: input.staffId,
    phone,
    date: input.dateYmd,
    shift: input.shift,
    updated_at: now.toISOString(),
  };
}

export function assignmentMapFromRows(
  rows: Array<{ shift?: unknown; staff_id?: unknown; phone?: unknown }>
): Record<OnCallShiftKey, OnCallAssignment | null> {
  const result: Record<OnCallShiftKey, OnCallAssignment | null> = {
    day: null,
    evening: null,
    night: null,
  };
  for (const row of rows) {
    if (!isOnCallShiftKey(row.shift)) continue;
    if (typeof row.staff_id !== 'string' || !isValidUuid(row.staff_id)) continue;
    if (typeof row.phone !== 'string') continue;
    const phone = normalizeDanishPhone(row.phone);
    if (!phone) continue;
    result[row.shift] = { staffId: row.staff_id, phone };
  }
  return result;
}

export function draftFromAssignments(
  assignments: Record<OnCallShiftKey, OnCallAssignment | null>
): OnCallDraft {
  const draft = emptyOnCallDraft();
  for (const shift of ON_CALL_SHIFT_KEYS) {
    const row = assignments[shift];
    if (!row) continue;
    draft[shift] = {
      staffId: row.staffId,
      phone: formatDanishPhoneDisplay(row.phone),
    };
  }
  return draft;
}

/** Demo-only: deterministic fake DK number. Must never be used on the live path. */
export function demoSimulatedOnCallPhone(dateYmd: string, shift: OnCallShiftKey): string {
  const seed = hashSeed(`${dateYmd}-${shift}`);
  const d1 = (seed % 9) + 1;
  const d2 = (((seed >> 3) % 10) + 10) % 10;
  const d3 = (((seed >> 6) % 10) + 10) % 10;
  const d4 = (((seed >> 9) % 10) + 10) % 10;
  const d5 = (((seed >> 12) % 10) + 10) % 10;
  const d6 = (((seed >> 15) % 10) + 10) % 10;
  const d7 = (((seed >> 18) % 10) + 10) % 10;
  const d8 = (((seed >> 21) % 10) + 10) % 10;
  return `${d1}${d2} ${d3}${d4} ${d5}${d6} ${d7}${d8}`;
}

export function demoOnCallDraft(dateYmd: string): OnCallDraft {
  return {
    day: { staffId: 'demo-staff-ln', phone: demoSimulatedOnCallPhone(dateYmd, 'day') },
    evening: { staffId: 'demo-staff-cc', phone: demoSimulatedOnCallPhone(dateYmd, 'evening') },
    night: { staffId: 'demo-staff-ht', phone: demoSimulatedOnCallPhone(dateYmd, 'night') },
  };
}

export const DEMO_ON_CALL_STAFF: OnCallStaffOption[] = [
  { id: 'demo-staff-ln', fullName: 'Louise N.' },
  { id: 'demo-staff-cc', fullName: 'Christian C.' },
  { id: 'demo-staff-ht', fullName: 'Helle T.' },
];

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

/**
 * «Vagten»: forsiden følger vagtens rytme i tre øjeblikke. Rene hjælpefunktioner, så
 * både API-ruten og testene bruger samme regler.
 */
import { normalizeHandoverShiftDate, type HandoverShiftLabel } from '@/lib/handoverNotes';

export type ShiftNow = Exclude<HandoverShiftLabel, 'doegnnotat'>;
export type VagtMoment = 'moed' | 'nu' | 'hjem';

/** Vagternes start og slut i dansk tid (time på døgnet). Nat går over midnat. */
export const SHIFT_HOURS: Record<ShiftNow, { start: number; end: number }> = {
  dag: { start: 7, end: 15 },
  aften: { start: 15, end: 23 },
  nat: { start: 23, end: 7 },
};

export const SHIFT_NAMES: Record<ShiftNow, string> = {
  dag: 'Dagvagt',
  aften: 'Aftenvagt',
  nat: 'Nattevagt',
};

export function copenhagenHourMinute(ref = new Date()): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Copenhagen',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(ref);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return { hour, minute };
}

/** Minutter siden vagtens start (0 … 479). */
export function minutesIntoShift(shift: ShiftNow, ref = new Date()): number {
  const { hour, minute } = copenhagenHourMinute(ref);
  const sinceStart = (hour - SHIFT_HOURS[shift].start + 24) % 24;
  return sinceStart * 60 + minute;
}

/** Første time: Mød ind. Sidste time: Gå hjem. Ellers: Nu. */
export function defaultMoment(shift: ShiftNow, ref = new Date()): VagtMoment {
  const m = minutesIntoShift(shift, ref);
  if (m < 60) return 'moed';
  if (m >= 7 * 60) return 'hjem';
  return 'nu';
}

export type HandoverRow = {
  resident_id: string;
  shift_label: string;
  shift_date: string;
  body: string;
  flag_color: string | null;
  updated_at: string;
};

/**
 * Det, kollegerne skrev på de seneste vagter, uden den vagt man selv står i.
 * Nyeste notat pr. borger, kun med tekst eller flag.
 */
export function previousHandovers(
  rows: HandoverRow[],
  current: { shiftDate: string; shiftLabel: string }
): HandoverRow[] {
  const byResident = new Map<string, HandoverRow>();
  for (const row of rows) {
    const date = normalizeHandoverShiftDate(row.shift_date);
    if (date === current.shiftDate && row.shift_label === current.shiftLabel) continue;
    if (!row.body.trim() && !row.flag_color) continue;
    const prev = byResident.get(row.resident_id);
    if (!prev || Date.parse(row.updated_at) > Date.parse(prev.updated_at)) {
      byResident.set(row.resident_id, { ...row, shift_date: date });
    }
  }
  const weight = (f: string | null) => (f === 'roed' ? 0 : f === 'gul' ? 1 : 2);
  return [...byResident.values()].sort(
    (a, b) =>
      weight(a.flag_color) - weight(b.flag_color) ||
      Date.parse(b.updated_at) - Date.parse(a.updated_at)
  );
}

export type CheckinRow = {
  resident_id: string;
  traffic_light: string | null;
  mood_score: number | null;
  created_at: string;
};

/** Seneste Lys-tjek-ind pr. borger, kun hvis det er gult eller rødt. Rød først. */
export function lysConcerns(rows: CheckinRow[]): CheckinRow[] {
  const latest = new Map<string, CheckinRow>();
  for (const row of rows) {
    const prev = latest.get(row.resident_id);
    if (!prev || Date.parse(row.created_at) > Date.parse(prev.created_at)) {
      latest.set(row.resident_id, row);
    }
  }
  return [...latest.values()]
    .filter((r) => r.traffic_light === 'rød' || r.traffic_light === 'gul')
    .sort(
      (a, b) =>
        (a.traffic_light === 'rød' ? 0 : 1) - (b.traffic_light === 'rød' ? 0 : 1) ||
        Date.parse(b.created_at) - Date.parse(a.created_at)
    );
}

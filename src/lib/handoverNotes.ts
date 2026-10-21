import { copenhagenHour, copenhagenYmd } from '@/lib/copenhagenDay';

export const HANDOVER_SHIFT_LABELS = ['dag', 'aften', 'nat', 'doegnnotat'] as const;
export type HandoverShiftLabel = (typeof HANDOVER_SHIFT_LABELS)[number];

export const HANDOVER_FLAG_COLORS = ['groen', 'gul', 'roed', 'sort'] as const;
export type HandoverFlagColor = (typeof HANDOVER_FLAG_COLORS)[number];

export const HANDOVER_NOTE_MAX_CHARS = 8000;

export type HandoverNoteUpsertRow = {
  resident_id: string;
  org_id: string;
  staff_id: string | null;
  flag_color: HandoverFlagColor | null;
  shift_label: HandoverShiftLabel;
  shift_date: string;
  body: string;
  updated_at: string;
};

export type StoredHandoverNote = {
  resident_id: string;
  shift_label: string;
  shift_date: string;
  body: string;
  flag_color: string | null;
  created_at: string;
};

export function isHandoverShiftLabel(value: string): value is HandoverShiftLabel {
  return (HANDOVER_SHIFT_LABELS as readonly string[]).includes(value);
}

export function isHandoverFlagColor(value: string | null | undefined): value is HandoverFlagColor {
  return typeof value === 'string' && (HANDOVER_FLAG_COLORS as readonly string[]).includes(value);
}

export function handoverShiftLabelDa(shift: HandoverShiftLabel): string {
  if (shift === 'doegnnotat') return 'Døgnnotat';
  return `${shift.charAt(0).toUpperCase()}${shift.slice(1)}vagt`;
}

export function shouldPersistHandoverEntry(entry: {
  note: string;
  flagColor: string | null;
}): boolean {
  return Boolean(entry.note.trim() || entry.flagColor);
}

export function clipHandoverBody(note: string): string {
  const trimmed = note.trim();
  if (trimmed.length <= HANDOVER_NOTE_MAX_CHARS) return trimmed;
  return trimmed.slice(0, HANDOVER_NOTE_MAX_CHARS);
}

export function handoverShiftDate(ref = new Date()): string {
  return copenhagenYmd(ref);
}

/** Nattevagten slutter kl. 7. Før det hører notatet til den dag, vagten startede. */
const NIGHT_SHIFT_END_HOUR = 7;

function previousCopenhagenYmd(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Datoen et vagtnotat gemmes under.
 * Dag og aften følger kalenderdagen. Nat (23–07) beholder startdatoen, også efter midnat,
 * så et notat skrevet kl. 23:40 og en linje kl. 01:10 lander på samme række.
 */
export function handoverRecordDate(shift: HandoverShiftLabel, ref = new Date()): string {
  const today = copenhagenYmd(ref);
  if (shift === 'nat' && copenhagenHour(ref) < NIGHT_SHIFT_END_HOUR) {
    return previousCopenhagenYmd(today);
  }
  return today;
}

/**
 * Nattevagtsrækker skrevet efter midnat blev tidligere stemplet med morgenens dato.
 * De hører til vagten, der startede dagen før. En række, der allerede ligger på startdatoen,
 * flyttes ikke, heller ikke når den er rettet kl. 6.
 */
export function anchorHandoverShiftDate(
  shiftDate: string,
  shiftLabel: string,
  atIso: string
): string {
  const date = normalizeHandoverShiftDate(shiftDate);
  if (shiftLabel !== 'nat') return date;
  const at = new Date(atIso);
  if (Number.isNaN(at.getTime()) || copenhagenHour(at) >= NIGHT_SHIFT_END_HOUR) return date;
  if (copenhagenYmd(at) !== date) return date;
  return previousCopenhagenYmd(date);
}

/** Vagten lige nu efter dansk klokkeslæt: dag 07–15, aften 15–23, ellers nat. */
export function handoverShiftNow(ref = new Date()): Exclude<HandoverShiftLabel, 'doegnnotat'> {
  const hour = copenhagenHour(ref);
  if (hour >= 7 && hour < 15) return 'dag';
  if (hour >= 15 && hour < 23) return 'aften';
  return 'nat';
}

/**
 * To tekster om samme vagt. Den nye linje lægges under, medmindre den allerede står i notatet,
 * så en fejlplaceret række ikke fordobler teksten, næste gang den læses.
 */
export function mergeHandoverBodies(
  existing: string | null | undefined,
  extra: string | null | undefined
): string {
  const prev = (existing ?? '').trim();
  const next = (extra ?? '').trim();
  if (!next) return prev;
  if (!prev || prev === next) return clipHandoverBody(prev || next);
  // Allerede lagt sammen ved et tidligere læs: behold den længste, så linjen ikke kommer to gange.
  if (prev.endsWith(`\n${next}`) || prev.startsWith(`${next}\n`)) return clipHandoverBody(prev);
  if (next.endsWith(`\n${prev}`) || next.startsWith(`${prev}\n`)) return clipHandoverBody(next);
  return clipHandoverBody(`${prev}\n${next}`);
}

function preferHandoverFlag(a: string | null, b: string | null): string | null {
  const rank = (f: string | null) =>
    f === 'roed' || f === 'sort' ? 3 : f === 'gul' ? 2 : f === 'groen' ? 1 : 0;
  return rank(a) >= rank(b) ? a : b;
}

/** Tilføjer en linje til et eksisterende vagtnotat uden at overskrive det, der står. */
export function appendHandoverLine(existing: string | null | undefined, line: string): string {
  const prev = (existing ?? '').trim();
  const next = line.trim();
  if (!next) return prev;
  return clipHandoverBody(prev ? `${prev}\n${next}` : next);
}

export function buildHandoverUpsertRows(args: {
  entries: Array<{ residentId: string; note: string; flagColor: string | null }>;
  orgId: string;
  staffId: string | null;
  shiftLabel: HandoverShiftLabel;
  shiftDate: string;
  nowIso?: string;
}): HandoverNoteUpsertRow[] {
  const updatedAt = args.nowIso ?? new Date().toISOString();
  const rows: HandoverNoteUpsertRow[] = [];
  for (const entry of args.entries) {
    if (!shouldPersistHandoverEntry(entry)) continue;
    rows.push({
      resident_id: entry.residentId,
      org_id: args.orgId,
      staff_id: args.staffId,
      flag_color: isHandoverFlagColor(entry.flagColor) ? entry.flagColor : null,
      shift_label: args.shiftLabel,
      shift_date: args.shiftDate,
      body: clipHandoverBody(entry.note),
      updated_at: updatedAt,
    });
  }
  return rows;
}

function noteKey(residentId: string, shiftDate: string, shiftLabel: string): string {
  return `${residentId}|${shiftDate}|${shiftLabel}`;
}

function createdMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** PostgREST may return `date` as `YYYY-MM-DD` or a midnight ISO timestamp. */
export function normalizeHandoverShiftDate(value: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return m?.[1] ?? value.trim();
}

/**
 * Samler rækker, der er den samme vagt. En nattevagt stemplet med morgenens dato
 * lægges sammen med notatet fra den aften, vagten startede, ældste tekst først.
 */
export function collapseHandoverNotes(notes: StoredHandoverNote[]): StoredHandoverNote[] {
  const groups = new Map<string, StoredHandoverNote>();
  for (const note of notes) {
    const shiftDate = anchorHandoverShiftDate(note.shift_date, note.shift_label, note.created_at);
    const key = noteKey(note.resident_id, shiftDate, note.shift_label);
    const anchored = { ...note, shift_date: shiftDate };
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, anchored);
      continue;
    }
    const newerIsAnchored = createdMs(anchored.created_at) >= createdMs(existing.created_at);
    const older = newerIsAnchored ? existing : anchored;
    const newer = newerIsAnchored ? anchored : existing;
    groups.set(key, {
      ...newer,
      shift_date: shiftDate,
      body: mergeHandoverBodies(older.body, newer.body),
      flag_color: preferHandoverFlag(older.flag_color, newer.flag_color),
    });
  }
  return [...groups.values()];
}

export function applyStoredNotes<
  T extends {
    residentId: string;
    note: string;
    flagColor: string | null;
    previousNote?: string;
    previousShift?: string;
  },
>(
  entries: T[],
  notes: StoredHandoverNote[],
  current: { shiftDate: string; shiftLabel: HandoverShiftLabel }
): Array<
  T & {
    previousNote?: string;
    previousShift?: string;
  }
> {
  const currentByResident = new Map<string, StoredHandoverNote>();
  const previousByResident = new Map<string, StoredHandoverNote>();

  for (const note of collapseHandoverNotes(notes)) {
    const shiftDate = normalizeHandoverShiftDate(note.shift_date);
    if (shiftDate === current.shiftDate && note.shift_label === current.shiftLabel) {
      const existing = currentByResident.get(note.resident_id);
      if (!existing || createdMs(note.created_at) >= createdMs(existing.created_at)) {
        currentByResident.set(note.resident_id, note);
      }
      continue;
    }
    const existingPrev = previousByResident.get(note.resident_id);
    if (!existingPrev || createdMs(note.created_at) > createdMs(existingPrev.created_at)) {
      previousByResident.set(note.resident_id, note);
    }
  }

  return entries.map((entry) => {
    const currentNote = currentByResident.get(entry.residentId);
    const previous = previousByResident.get(entry.residentId);
    const flagColor =
      currentNote && isHandoverFlagColor(currentNote.flag_color)
        ? currentNote.flag_color
        : entry.flagColor;
    const previousShift =
      previous && isHandoverShiftLabel(previous.shift_label)
        ? `${handoverShiftLabelDa(previous.shift_label)} · ${normalizeHandoverShiftDate(previous.shift_date)}`
        : previous
          ? normalizeHandoverShiftDate(previous.shift_date)
          : entry.previousShift;
    return {
      ...entry,
      note: currentNote?.body ?? entry.note,
      flagColor,
      previousNote: previous?.body?.trim() ? previous.body : entry.previousNote,
      previousShift: previous?.body?.trim() ? previousShift : entry.previousShift,
    };
  });
}

/** Exposed for tests that assert upsert identity columns. */
export function handoverConflictKey(
  row: Pick<HandoverNoteUpsertRow, 'resident_id' | 'shift_date' | 'shift_label'>
): string {
  return noteKey(row.resident_id, row.shift_date, row.shift_label);
}

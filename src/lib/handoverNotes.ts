import { copenhagenYmd } from '@/lib/copenhagenDay';

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

  for (const note of notes) {
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

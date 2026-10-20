/**
 * Handlinger assistenten kan foreslå. Intet udføres, før en medarbejder har godkendt;
 * alt valideres her, både når AI foreslår det, og når klienten sender det tilbage rettet.
 */
import { formatDanishDate } from '@/lib/documents/render';
import { PLANNER_APPOINTMENT_TYPES, type PlannerAppointmentType } from '@/lib/plannerEntries';

export const JOURNAL_CATEGORIES = [
  'Døgnnotat',
  'Sundhed',
  'Socialt',
  'Hændelse',
  'Samtale',
] as const;
export type JournalCategoryKey = (typeof JOURNAL_CATEGORIES)[number];

export type JournalNoteAction = {
  id: string;
  type: 'journal_note';
  category: JournalCategoryKey;
  text: string;
};
export type TaskAction = { id: string; type: 'task'; title: string; deadline: string };
export type CalendarAction = {
  id: string;
  type: 'calendar';
  title: string;
  category: PlannerAppointmentType;
  date: string;
  time: string;
  location: string;
};
export type MedicationRequestAction = { id: string; type: 'medication_request'; text: string };
export type HandoverAction = { id: string; type: 'handover'; text: string };

export type AssistantAction =
  | JournalNoteAction
  | TaskAction
  | CalendarAction
  | MedicationRequestAction
  | HandoverAction;

export const ACTION_LABELS: Record<AssistantAction['type'], string> = {
  journal_note: 'Journalnotat (kladde)',
  task: 'Opgave',
  calendar: 'Aftale i kalenderen',
  medication_request: 'Til medicinansvarlig',
  handover: 'Til vagtoverleveringen',
};

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_ACTIONS = 8;

function isYmd(v: unknown): v is string {
  if (typeof v !== 'string' || !YMD_RE.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function text(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/\r\n/g, '\n').trim().slice(0, max) : '';
}

/**
 * Validerer en liste af handlinger. Ukendte typer og ugyldige felter fjernes; datoer uden for
 * ±1 år fra `today` afvises, så en fejltolkning ikke lander langt ude i fremtiden.
 */
export function sanitizeActions(raw: unknown, today: string): AssistantAction[] {
  if (!Array.isArray(raw)) return [];
  const min = shiftYmd(today, -365);
  const max = shiftYmd(today, 365);
  const inRange = (d: string) => d >= min && d <= max;
  const out: AssistantAction[] = [];
  for (const [i, item] of raw.slice(0, MAX_ACTIONS * 2).entries()) {
    if (typeof item !== 'object' || item === null) continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' && /^[a-z0-9-]{1,40}$/i.test(o.id) ? o.id : `a${i + 1}`;
    if (o.type === 'journal_note') {
      const t = text(o.text, 4000);
      const category = (JOURNAL_CATEGORIES as readonly string[]).includes(String(o.category))
        ? (o.category as JournalCategoryKey)
        : 'Døgnnotat';
      if (t) out.push({ id, type: 'journal_note', category, text: t });
    } else if (o.type === 'task') {
      const title = text(o.title, 300);
      const deadline = isYmd(o.deadline) && inRange(o.deadline) ? o.deadline : today;
      if (title) out.push({ id, type: 'task', title, deadline });
    } else if (o.type === 'calendar') {
      const title = text(o.title, 200);
      const category = (PLANNER_APPOINTMENT_TYPES as readonly string[]).includes(String(o.category))
        ? (o.category as PlannerAppointmentType)
        : 'andet';
      const time = typeof o.time === 'string' && TIME_RE.test(o.time) ? o.time : '';
      if (title && isYmd(o.date) && inRange(o.date) && time) {
        out.push({
          id,
          type: 'calendar',
          title,
          category,
          date: o.date,
          time,
          location: text(o.location, 120),
        });
      }
    } else if (o.type === 'medication_request') {
      const t = text(o.text, 500);
      if (t) out.push({ id, type: 'medication_request', text: t });
    } else if (o.type === 'handover') {
      const t = text(o.text, 500);
      if (t) out.push({ id, type: 'handover', text: t });
    }
    if (out.length >= MAX_ACTIONS) break;
  }
  // Unikke id'er, så klienten kan slå dem til og fra hver for sig.
  const seen = new Set<string>();
  return out.map((a, i) => {
    const unique = seen.has(a.id) ? `${a.id}-${i}` : a.id;
    seen.add(unique);
    return { ...a, id: unique };
  });
}

export function shiftYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Kort beskrivelse af en handling til lister og historik. */
export function describeAction(a: AssistantAction): string {
  switch (a.type) {
    case 'journal_note':
      return `${a.category}: ${a.text.length > 80 ? `${a.text.slice(0, 79)}…` : a.text}`;
    case 'task':
      return `${a.title} (frist ${formatDanishDate(a.deadline)})`;
    case 'calendar':
      return `${a.title} ${formatDanishDate(a.date)} kl. ${a.time.replace(':', '.')}`;
    case 'medication_request':
    case 'handover':
      return a.text;
  }
}

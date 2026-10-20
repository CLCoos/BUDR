/**
 * «Borgerens forløb»: én levende side pr. borger. Rene funktioner, der gør Lys-tjek-ind,
 * notater og bekymringer til en humørkurve og en tidslinje.
 */
import { copenhagenYmd } from '@/lib/copenhagenDay';
import { minutesLate } from '@/lib/lys/medicationReminders';
import { NOT_GIVEN_AFTER_MINUTES, scheduledHhMm } from '@/lib/medicationSchedule';

export type Traffic = 'groen' | 'gul' | 'roed';

export type MoodDay = { day: string; mood: number | null; traffic: Traffic | null };

const TRAFFIC: Record<string, Traffic> = { grøn: 'groen', gul: 'gul', rød: 'roed' };

export function toTraffic(v: string | null | undefined): Traffic | null {
  return v ? (TRAFFIC[v] ?? null) : null;
}

function shift(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Én værdi pr. dansk kalenderdag, nyeste tjek-ind den dag. Dage uden tjek-ind er null. */
export function dailyMood(
  checkins: { mood_score: number | null; traffic_light: string | null; created_at: string }[],
  today: string,
  days = 14
): MoodDay[] {
  const latest = new Map<string, { at: number; mood: number | null; traffic: Traffic | null }>();
  for (const c of checkins) {
    const day = copenhagenYmd(new Date(c.created_at));
    const at = Date.parse(c.created_at);
    const prev = latest.get(day);
    if (!prev || at > prev.at) {
      latest.set(day, { at, mood: c.mood_score, traffic: toTraffic(c.traffic_light) });
    }
  }
  return Array.from({ length: days }, (_, i) => {
    const day = shift(today, i - days + 1);
    const hit = latest.get(day);
    return { day, mood: hit?.mood ?? null, traffic: hit?.traffic ?? null };
  });
}

/** Kort, ærlig opsummering af kurven. Null, hvis der er for få tjek-ind. */
export function moodSummary(days: MoodDay[]): string | null {
  const values = days.filter((d) => d.mood !== null) as (MoodDay & { mood: number })[];
  if (values.length < 3) return null;
  const half = Math.floor(values.length / 2);
  const avg = (xs: { mood: number }[]) => xs.reduce((s, x) => s + x.mood, 0) / xs.length;
  const first = avg(values.slice(0, half));
  const second = avg(values.slice(half));
  const red = values.filter((v) => v.traffic === 'roed').length;
  const trend =
    second - first >= 1
      ? 'Humøret er steget'
      : first - second >= 1
        ? 'Humøret er faldet'
        : 'Humøret har været nogenlunde stabilt';
  const redText = red > 0 ? ` ${red === 1 ? 'Én rød dag' : `${red} røde dage`}.` : '';
  return `${trend} de seneste ${days.length} dage (${values.length} tjek-ind).${redText}`;
}

export type TimelineKind = 'notat' | 'lys' | 'bekymring' | 'sundhed' | 'haendelse';

export type TimelineItem = {
  id: string;
  at: string;
  kind: TimelineKind;
  title: string;
  text: string;
  by?: string;
  draft?: boolean;
};

const CATEGORY_KIND: Record<string, TimelineKind> = {
  Sundhed: 'sundhed',
  Hændelse: 'haendelse',
};

export function buildTimeline(input: {
  journal: {
    id: string;
    entry_text: string;
    category: string;
    created_at: string;
    staff_name: string;
    journal_status?: string;
  }[];
  concerns: {
    id: string;
    note: string;
    category: string;
    staff_name: string;
    created_at: string;
  }[];
  checkins: {
    id: string;
    traffic_light: string | null;
    free_text: string | null;
    mood_score: number | null;
    created_at: string;
  }[];
  limit?: number;
}): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const j of input.journal) {
    if (j.journal_status === 'resident_private') continue;
    items.push({
      id: `j-${j.id}`,
      at: j.created_at,
      kind: CATEGORY_KIND[j.category] ?? 'notat',
      title: j.category || 'Notat',
      text: j.entry_text,
      by: j.staff_name,
      draft: j.journal_status === 'kladde',
    });
  }
  for (const c of input.concerns) {
    items.push({
      id: `c-${c.id}`,
      at: c.created_at,
      kind: 'bekymring',
      title: `Bekymring · ${c.category}`,
      text: c.note,
      by: c.staff_name,
    });
  }
  // Fra Lys kun det, personalet bør se: røde og gule dage eller ord, borgeren selv skrev.
  for (const c of input.checkins) {
    const traffic = toTraffic(c.traffic_light);
    const words = c.free_text?.trim();
    if (traffic !== 'roed' && traffic !== 'gul' && !words) continue;
    items.push({
      id: `l-${c.id}`,
      at: c.created_at,
      kind: 'lys',
      title: traffic === 'roed' ? 'Rød i Lys' : traffic === 'gul' ? 'Gul i Lys' : 'Skrev i Lys',
      text: words ? `«${words}»` : `Humør ${c.mood_score ?? '?'}/10.`,
    });
  }
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, input.limit ?? 12);
}

/** Borgerens egne ord fra recovery-profilen, i den rækkefølge de betyder mest for personalet. */
export const OWN_WORDS_FIELDS = [
  { key: 'hope_dreams', label: 'Drømmer om' },
  { key: 'hope_small_wishes', label: 'Ønsker sig lige nu' },
  { key: 'identity_proud_of', label: 'Er stolt af' },
  { key: 'identity_strengths', label: 'Er god til' },
  { key: 'meaning_values', label: 'Det vigtigste for mig' },
  { key: 'connectedness_people', label: 'Holder af' },
] as const;

export function ownWords(
  profile: Partial<Record<(typeof OWN_WORDS_FIELDS)[number]['key'], string | null>> | null,
  max = 3
): { label: string; text: string }[] {
  if (!profile) return [];
  const out: { label: string; text: string }[] = [];
  for (const f of OWN_WORDS_FIELDS) {
    const t = profile[f.key]?.trim();
    if (t) out.push({ label: f.label, text: t });
    if (out.length >= max) break;
  }
  return out;
}

export type MedTodayStatus = 'givet' | 'mangler' | 'senere' | 'pn';

/**
 * Dagens doser for borgeren. «Mangler» følger samme grænse som alarmen for glemt medicin
 * (60 min over tid uden kvittering). Behovsmedicin vises som «Ved behov».
 */
export function medsToday(
  meds: {
    id: string;
    name: string;
    dose: string;
    time_group: string;
    time_label: string;
    status: string;
  }[],
  givenIds: Set<string>,
  now: Date
): { id: string; time: string; name: string; status: MedTodayStatus }[] {
  return meds
    .filter((m) => m.status === 'aktiv')
    .map((m) => {
      const pn = m.time_group === 'behoev';
      const time = pn ? 'Ved behov' : scheduledHhMm(m.time_group, m.time_label);
      const late = pn ? null : minutesLate(now, time);
      const status: MedTodayStatus = pn
        ? 'pn'
        : givenIds.has(m.id)
          ? 'givet'
          : late !== null && late >= NOT_GIVEN_AFTER_MINUTES
            ? 'mangler'
            : 'senere';
      return { id: m.id, time, name: `${m.name} ${m.dose}`.trim(), status };
    })
    .sort(
      (a, b) =>
        (a.status === 'pn' ? 1 : 0) - (b.status === 'pn' ? 1 : 0) || a.time.localeCompare(b.time)
    );
}

export type NextItem = {
  id: string;
  when: string;
  what: string;
  deadline?: boolean;
  href?: string;
};

/** «Det næste»: kommende aftaler og åbne dokumenter med frist, tidligste først. */
export function nextUp(
  input: {
    appointments: { id: string; title: string; starts_at: string; location?: string | null }[];
    documents: { id: string; title: string; due_date: string }[];
    today: string;
    residentId: string;
  },
  max = 5
): NextItem[] {
  const items: (NextItem & { sort: string })[] = [];
  for (const a of input.appointments) {
    const day = copenhagenYmd(new Date(a.starts_at));
    const time = new Date(a.starts_at).toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Copenhagen',
    });
    items.push({
      id: `a-${a.id}`,
      sort: a.starts_at,
      when: `${relativeDay(day, input.today)} kl. ${time.replace('.', ':')}`,
      what: a.location ? `${a.title} · ${a.location}` : a.title,
    });
  }
  for (const d of input.documents) {
    const day = d.due_date.slice(0, 10);
    items.push({
      id: `d-${d.id}`,
      sort: `${day}T23:59`,
      when:
        day < input.today
          ? `Frist overskredet (${relativeDay(day, input.today)})`
          : `Frist ${relativeDay(day, input.today)}`,
      what: d.title,
      deadline: true,
      href: `/resident-360-view/${input.residentId}?tab=dokumenter&doc=${d.id}`,
    });
  }
  return items
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .slice(0, max)
    .map(({ sort: _sort, ...rest }) => rest);
}

const MONTHS = [
  'jan.',
  'feb.',
  'mar.',
  'apr.',
  'maj',
  'jun.',
  'jul.',
  'aug.',
  'sep.',
  'okt.',
  'nov.',
  'dec.',
];

/** «i dag», «i morgen», «i går» eller «3. nov.». */
export function relativeDay(day: string, today: string): string {
  if (day === today) return 'i dag';
  if (day === shift(today, 1)) return 'i morgen';
  if (day === shift(today, -1)) return 'i går';
  const [, m, d] = day.split('-').map(Number);
  return `${d}. ${MONTHS[(m ?? 1) - 1]}`;
}

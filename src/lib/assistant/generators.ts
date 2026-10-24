/**
 * Automatiske forslag fra assistenten. Rene funktioner: data ind, forslag ud. Cron-ruten henter
 * data og gemmer resultatet; her bestemmes kun hvad der foreslås, til hvem og med hvilken tekst.
 */
import { copenhagenYmd } from '@/lib/copenhagenDay';
import { getDocumentType } from '@/lib/documents/registry';
import { formatDanishDate } from '@/lib/documents/render';
import { shiftYmd, type AssistantAction } from './actions';
import { residentLabel, type ResidentNameRow } from './names';

export type SuggestionKind =
  | 'aftale_opfoelgning'
  | 'dokument_frist'
  | 'trafiklys'
  | 'svar'
  | 'fagsystem';

export type SuggestionInsert = {
  org_id: string;
  resident_id: string | null;
  recipient_id: string | null;
  audience: 'personlig' | 'ledere' | 'alle';
  kind: SuggestionKind;
  title: string;
  body: string | null;
  actions: AssistantAction[];
  prompt: string | null;
  link: string | null;
  dedupe_key: string;
  source: Record<string, unknown>;
  expires_at: string;
};

export type GeneratorResident = ResidentNameRow & { org_id: string };
export type ContactRow = { resident_id: string; staff_id: string };
export type PlannerRow = {
  id: string;
  org_id: string;
  resident_user_id: string | null;
  title: string;
  category: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
};
export type JournalRow = { resident_id: string; category: string | null; created_at: string };
export type DocumentRow = {
  id: string;
  org_id: string;
  resident_id: string;
  doc_type: string;
  title: string | null;
  status: string;
  due_date: string | null;
  responsible_id: string | null;
};
export type CheckinRow = { resident_id: string; created_at: string; traffic_light: string | null };
export type TransferNoteRow = {
  id: string;
  org_id: string | null;
  staff_id: string | null;
  created_at: string;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Aftaler der handler om helbred, også når de er oprettet som "andet". */
const HEALTH_RE =
  /læge|lægen|tandlæge|psykiater|hospital|sygehus|ambulatori|blodprøve|klinik|ekg|vaccin|sygeplejer|distriktspsykiatri|skadestue|øjenlæge|fodterapeut|jordemoder/i;

export function isHealthAppointment(p: Pick<PlannerRow, 'category' | 'title'>): boolean {
  return p.category === 'laege' || HEALTH_RE.test(p.title);
}

/** Borgeren i forslagets tekst: initialer, som alle andre steder i portalen (GDPR). */
export function firstName(r: ResidentNameRow): string {
  return residentLabel(r);
}

/** "Lægetid" → "lægetid", men "EKG" og "Tandlæge Hansen" røres kun i første bogstav når det er sikkert. */
function lcFirst(s: string): string {
  const t = s.trim();
  return t.length > 1 && t[1] === t[1]!.toLowerCase() ? t[0]!.toLowerCase() + t.slice(1) : t;
}

function clockDk(iso: string): string {
  return new Intl.DateTimeFormat('da-DK', {
    timeZone: 'Europe/Copenhagen',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(iso))
    .replace(':', '.');
}

/** Kontaktpersonerne får forslaget; har borgeren ingen, går det til hele bostedet. */
function recipients(
  residentId: string,
  contacts: ContactRow[]
): { recipient_id: string | null; audience: 'personlig' | 'alle' }[] {
  const ids = [
    ...new Set(contacts.filter((c) => c.resident_id === residentId).map((c) => c.staff_id)),
  ];
  return ids.length > 0
    ? ids.map((id) => ({ recipient_id: id, audience: 'personlig' as const }))
    : [{ recipient_id: null, audience: 'alle' as const }];
}

export function appointmentFollowUps(args: {
  now: Date;
  residents: GeneratorResident[];
  contacts: ContactRow[];
  planner: PlannerRow[];
  journal: JournalRow[];
}): SuggestionInsert[] {
  const { now, contacts } = args;
  const byId = new Map(args.residents.map((r) => [r.user_id, r]));
  const out: SuggestionInsert[] = [];
  for (const p of args.planner) {
    if (!p.resident_user_id || !isHealthAppointment(p)) continue;
    const resident = byId.get(p.resident_user_id);
    if (!resident || resident.org_id !== p.org_id) continue;
    const start = Date.parse(p.starts_at);
    const end = p.ends_at ? Date.parse(p.ends_at) : start + HOUR;
    // Først når aftalen er overstået, og højst 12 timer efter.
    if (!(end <= now.getTime() && end >= now.getTime() - 12 * HOUR)) continue;
    const documented = args.journal.some(
      (j) =>
        j.resident_id === p.resident_user_id &&
        j.category === 'Sundhed' &&
        Date.parse(j.created_at) >= start - HOUR
    );
    if (documented) continue;

    const name = firstName(resident);
    const clock = clockDk(p.starts_at);
    const where = p.location && p.location !== '—' ? ` (${p.location})` : '';
    const sameDay = copenhagenYmd(new Date(start)) === copenhagenYmd(now);
    const when = sameDay
      ? `i dag kl. ${clock}`
      : `${formatDanishDate(copenhagenYmd(new Date(start)))} kl. ${clock}`;
    const note: AssistantAction = {
      id: 'note',
      type: 'journal_note',
      category: 'Sundhed',
      text: `${name} var til ${lcFirst(p.title)} ${when}${where}.`,
    };
    for (const to of recipients(resident.user_id, contacts)) {
      out.push({
        org_id: p.org_id,
        resident_id: resident.user_id,
        ...to,
        kind: 'aftale_opfoelgning',
        title: `${name} havde ${lcFirst(p.title)} ${when}. Skal jeg skrive det i sundhedsjournalen?`,
        body: null,
        actions: [note],
        prompt: 'Fortæl kort, hvordan det gik, så skriver jeg notatet og det, der skal følges op.',
        link: null,
        dedupe_key: `planner:${p.id}:${to.recipient_id ?? 'alle'}`,
        source: { planner_entry_id: p.id },
        expires_at: new Date(now.getTime() + 2 * DAY).toISOString(),
      });
    }
  }
  return out;
}

export function documentDeadlines(args: {
  now: Date;
  residents: GeneratorResident[];
  documents: DocumentRow[];
}): SuggestionInsert[] {
  const today = copenhagenYmd(args.now);
  const horizon = shiftYmd(today, 7);
  const byId = new Map(args.residents.map((r) => [r.user_id, r]));
  const out: SuggestionInsert[] = [];
  for (const d of args.documents) {
    if (!d.due_date || d.due_date > horizon) continue;
    if (d.status !== 'kladde' && d.status !== 'til_godkendelse') continue;
    const resident = byId.get(d.resident_id);
    if (!resident || resident.org_id !== d.org_id) continue;
    const name = firstName(resident);
    const docTitle = d.title || getDocumentType(d.doc_type)?.title || 'Dokumentet';
    const overdue = d.due_date < today;
    const waiting = d.status === 'til_godkendelse';
    const due = d.due_date === today ? 'i dag' : formatDanishDate(d.due_date);
    const title = waiting
      ? `${docTitle} for ${name} venter på godkendelse (frist ${due}).`
      : overdue
        ? `${docTitle} for ${name} er over fristen (${due}). Skal vi gøre den færdig?`
        : `${docTitle} for ${name} skal være færdig ${d.due_date === today ? 'i dag' : `senest ${due}`}.`;
    const to =
      waiting || !d.responsible_id
        ? { recipient_id: null, audience: 'ledere' as const }
        : { recipient_id: d.responsible_id, audience: 'personlig' as const };
    out.push({
      org_id: d.org_id,
      resident_id: d.resident_id,
      ...to,
      kind: 'dokument_frist',
      title,
      body: waiting ? 'Åbn dokumentet, læs det igennem og godkend eller send det tilbage.' : null,
      actions: [],
      prompt: null,
      link: `/resident-360-view/${d.resident_id}?tab=dokumenter&doc=${d.id}`,
      dedupe_key: `doc-due:${d.id}:${d.status}:${d.due_date}`,
      source: { document_id: d.id },
      expires_at: new Date(args.now.getTime() + 7 * DAY).toISOString(),
    });
  }
  return out;
}

/** Seneste trafiklys pr. dansk kalenderdag. */
function lightsByDay(checkins: CheckinRow[], residentId: string): Map<string, string> {
  const rows = checkins
    .filter((c) => c.resident_id === residentId && c.traffic_light)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const map = new Map<string, string>();
  for (const c of rows) map.set(copenhagenYmd(new Date(c.created_at)), c.traffic_light!);
  return map;
}

export function trafficLightStreaks(args: {
  now: Date;
  residents: GeneratorResident[];
  contacts: ContactRow[];
  checkins: CheckinRow[];
  streak?: number;
}): SuggestionInsert[] {
  const need = args.streak ?? 3;
  const today = copenhagenYmd(args.now);
  const out: SuggestionInsert[] = [];
  for (const r of args.residents) {
    const days = lightsByDay(args.checkins, r.user_id);
    // Løbet skal slutte i dag; dage uden check-in bryder det.
    let start = today;
    let count = 0;
    for (let d = today; ; d = shiftYmd(d, -1)) {
      const light = days.get(d);
      if (light !== 'gul' && light !== 'rød') break;
      start = d;
      count += 1;
      if (count > 60) break;
    }
    if (count < need) continue;
    const name = firstName(r);
    const todayLight = days.get(today);
    const task: AssistantAction = {
      id: 'snak',
      type: 'task',
      title: `Tag en snak med ${name} om, hvordan det går`,
      deadline: today,
    };
    for (const to of recipients(r.user_id, args.contacts)) {
      out.push({
        org_id: r.org_id,
        resident_id: r.user_id,
        ...to,
        kind: 'trafiklys',
        title: `${name} har meldt gul eller rød ${count} dage i træk. Skal jeg lave en opgave om at tage en snak i dag?`,
        body: `I dag: ${todayLight}.`,
        actions: [task],
        prompt: 'Har I allerede talt sammen? Fortæl kort hvad I talte om, så skriver jeg det.',
        link: `/resident-360-view/${r.user_id}`,
        dedupe_key: `trafik:${r.user_id}:${start}:${to.recipient_id ?? 'alle'}`,
        source: { streak_start: start, days: count },
        expires_at: new Date(args.now.getTime() + 2 * DAY).toISOString(),
      });
    }
  }
  return out;
}

function copenhagenHour(d: Date): number {
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Copenhagen',
    hour: '2-digit',
    hour12: false,
  }).format(d);
  return Number(h) % 24;
}

/**
 * Påmindelse til den, der skrev notaterne: godkendte notater fra tidligere dage, som ikke er
 * overført til fagsystemet. Kun i bosteder, der bruger overførslen (har overført mindst ét notat),
 * og først fra kl. 7, så nattevagten ikke får den midt i vagten.
 */
export function fagsystemReminders(args: {
  now: Date;
  notes: TransferNoteRow[];
  transferredIds: Set<string>;
  activeOrgs: Set<string>;
}): SuggestionInsert[] {
  if (copenhagenHour(args.now) < 7) return [];
  const today = copenhagenYmd(args.now);
  const counts = new Map<string, { org_id: string; staff_id: string; n: number }>();
  for (const note of args.notes) {
    if (!note.org_id || !note.staff_id || !args.activeOrgs.has(note.org_id)) continue;
    if (args.transferredIds.has(note.id)) continue;
    if (copenhagenYmd(new Date(note.created_at)) >= today) continue;
    const key = `${note.org_id}|${note.staff_id}`;
    const cur = counts.get(key);
    if (cur) cur.n += 1;
    else counts.set(key, { org_id: note.org_id, staff_id: note.staff_id, n: 1 });
  }
  return [...counts.values()].map((c) => ({
    org_id: c.org_id,
    resident_id: null,
    recipient_id: c.staff_id,
    audience: 'personlig' as const,
    kind: 'fagsystem' as const,
    title:
      c.n === 1
        ? 'Du har 1 notat fra de seneste dage, som ikke er overført til fagsystemet.'
        : `Du har ${c.n} notater fra de seneste dage, som ikke er overført til fagsystemet.`,
    body: 'Åbn listen, tryk Kopiér og sæt teksten ind i fagsystemet.',
    actions: [],
    prompt: null,
    link: '/care-portal-fagsystem?mine=1',
    dedupe_key: `fagsystem:${c.staff_id}:${today}`,
    source: { notes: c.n },
    expires_at: new Date(args.now.getTime() + DAY).toISOString(),
  }));
}

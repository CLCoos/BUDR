/**
 * Lederens tilsynsoverblik: «Er vi klar, hvis tilsynet kommer i morgen?»
 * Hvert signal bygger kun på data, portalen faktisk har. Rene funktioner, så ruten og
 * testene bruger samme grænser.
 */
import { formatDanishDate } from '@/lib/documents/render';

export type SignalTone = 'ok' | 'obs' | 'kritisk';

export type TilsynItem = { label: string; detail?: string; href?: string };

export type TilsynSignal = {
  key: 'godkendelser' | 'frister' | 'magtanvendelser' | 'notater' | 'trivsel' | 'fagsystem';
  title: string;
  tone: SignalTone;
  summary: string;
  items: TilsynItem[];
  href?: string;
};

export type TilsynInput = {
  today: string;
  /** Journalkladder i organisationen: oprettet-tidspunkt. */
  journalDrafts: { createdAt: string }[];
  /** Dokumenter, der ikke er godkendt endnu. */
  openDocuments: {
    id: string;
    residentId: string;
    residentName: string;
    title: string;
    status: string;
    dueDate: string | null;
  }[];
  /** Magtanvendelser de seneste 90 dage. */
  forceReports: {
    id: string;
    residentId: string;
    residentName: string;
    status: string;
    createdAt: string;
  }[];
  /** Borgere og seneste godkendte eller kladde-notat (null = ingen notat i perioden). */
  residentsLastNote: { residentId: string; name: string; lastNoteAt: string | null }[];
  /** Borgere med rød i Lys de seneste 7 dage og antal røde dage. */
  lysRed: { residentId: string; name: string; redDays: number }[];
  /**
   * Godkendte notater de seneste 14 dage, der ikke er markeret overført til fagsystem.
   * null = bostedet bruger ikke overførslen, så signalet vises ikke.
   */
  untransferredNotes: number | null;
  now?: Date;
};

const DAY = 86400000;

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / DAY
  );
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function residentLink(id: string, tab?: string): string {
  return `/resident-360-view/${id}${tab ? `?tab=${tab}` : ''}`;
}

export function buildTilsynSignals(input: TilsynInput): TilsynSignal[] {
  const now = input.now ?? new Date();
  const signals: TilsynSignal[] = [];

  // 1. Godkendelser
  const oldDrafts = input.journalDrafts.filter(
    (d) => now.getTime() - Date.parse(d.createdAt) > DAY
  ).length;
  const docsAwaiting = input.openDocuments.filter((d) => d.status === 'til_godkendelse');
  signals.push({
    key: 'godkendelser',
    title: 'Godkendelser',
    tone: oldDrafts > 0 || docsAwaiting.length > 0 ? (oldDrafts > 10 ? 'kritisk' : 'obs') : 'ok',
    summary:
      oldDrafts === 0 && docsAwaiting.length === 0
        ? 'Ingen notater eller dokumenter venter på godkendelse.'
        : [
            oldDrafts > 0
              ? `${plural(oldDrafts, 'journalkladde', 'journalkladder')} over et døgn gamle`
              : null,
            docsAwaiting.length > 0
              ? `${plural(docsAwaiting.length, 'dokument', 'dokumenter')} venter på din godkendelse`
              : null,
          ]
            .filter(Boolean)
            .join(' og ') + '.',
    items: docsAwaiting.slice(0, 5).map((d) => ({
      label: `${d.title} · ${d.residentName}`,
      href: `${residentLink(d.residentId, 'dokumenter')}&doc=${d.id}`,
    })),
    href: '/care-portal-journal',
  });

  // 2. Dokumentation til tiden
  const overdue = input.openDocuments.filter((d) => d.dueDate && d.dueDate < input.today);
  const soon = input.openDocuments.filter(
    (d) => d.dueDate && d.dueDate >= input.today && daysBetween(input.today, d.dueDate) <= 14
  );
  signals.push({
    key: 'frister',
    title: 'Dokumentation til tiden',
    tone: overdue.length > 0 ? 'kritisk' : soon.length > 0 ? 'obs' : 'ok',
    summary:
      overdue.length > 0
        ? `${plural(overdue.length, 'dokument', 'dokumenter')} har overskredet fristen.`
        : soon.length > 0
          ? `${plural(soon.length, 'dokument', 'dokumenter')} har frist inden for 14 dage.`
          : 'Ingen dokumenter har frist inden for 14 dage.',
    items: [...overdue, ...soon].slice(0, 6).map((d) => {
      const days = daysBetween(input.today, d.dueDate!);
      return {
        label: `${d.title} · ${d.residentName}`,
        detail: days < 0 ? `${-days} dage over` : days === 0 ? 'i dag' : `om ${days} dage`,
        href: `${residentLink(d.residentId, 'dokumenter')}&doc=${d.id}`,
      };
    }),
  });

  // 3. Magtanvendelser
  const unapprovedForce = input.forceReports.filter((f) => f.status !== 'godkendt');
  signals.push({
    key: 'magtanvendelser',
    title: 'Magtanvendelser',
    tone: unapprovedForce.length > 0 ? 'kritisk' : 'ok',
    summary:
      input.forceReports.length === 0
        ? 'Ingen magtanvendelser registreret de seneste 90 dage.'
        : unapprovedForce.length > 0
          ? `${plural(unapprovedForce.length, 'indberetning', 'indberetninger')} er ikke godkendt endnu.`
          : `${plural(input.forceReports.length, 'indberetning', 'indberetninger')} de seneste 90 dage, alle godkendt.`,
    items: unapprovedForce.slice(0, 5).map((f) => ({
      label: f.residentName,
      detail: `oprettet ${formatDanishDate(f.createdAt.slice(0, 10))}`,
      href: `${residentLink(f.residentId, 'dokumenter')}&doc=${f.id}`,
    })),
  });

  // 4. Løbende notater
  const silent = input.residentsLastNote.filter(
    (r) => !r.lastNoteAt || now.getTime() - Date.parse(r.lastNoteAt) > 7 * DAY
  );
  signals.push({
    key: 'notater',
    title: 'Løbende dokumentation',
    tone: silent.length === 0 ? 'ok' : silent.length > 3 ? 'kritisk' : 'obs',
    summary:
      silent.length === 0
        ? 'Alle borgere har fået et notat inden for 7 dage.'
        : `${plural(silent.length, 'borger', 'borgere')} har ikke fået et notat i 7 dage.`,
    items: silent.slice(0, 6).map((r) => ({
      label: r.name,
      detail: r.lastNoteAt ? `sidst ${formatDanishDate(r.lastNoteAt.slice(0, 10))}` : 'intet notat',
      href: residentLink(r.residentId),
    })),
  });

  // 5. Trivsel
  const repeated = input.lysRed.filter((r) => r.redDays >= 2);
  signals.push({
    key: 'trivsel',
    title: 'Trivsel i Lys',
    tone: repeated.length > 0 ? 'obs' : 'ok',
    summary:
      input.lysRed.length === 0
        ? 'Ingen borgere har meldt rødt i Lys de seneste 7 dage.'
        : `${plural(input.lysRed.length, 'borger', 'borgere')} har meldt rødt de seneste 7 dage${
            repeated.length > 0 ? `, ${repeated.length} af dem flere gange` : ''
          }. Tjek at der er fulgt op.`,
    items: [...input.lysRed]
      .sort((a, b) => b.redDays - a.redDays)
      .slice(0, 5)
      .map((r) => ({
        label: r.name,
        detail: plural(r.redDays, 'rød dag', 'røde dage'),
        href: residentLink(r.residentId),
      })),
  });

  // 6. Fagsystem (kun når bostedet bruger overførslen)
  const untransferred = input.untransferredNotes;
  if (untransferred !== null) {
    signals.push({
      key: 'fagsystem',
      title: 'Overført til fagsystem',
      tone: untransferred === 0 ? 'ok' : untransferred > 20 ? 'kritisk' : 'obs',
      summary:
        untransferred === 0
          ? 'Alle godkendte notater fra de seneste 14 dage er overført.'
          : `${plural(untransferred, 'godkendt notat', 'godkendte notater')} fra de seneste 14 dage mangler at blive overført.`,
      items: [],
      href: '/care-portal-fagsystem',
    });
  }

  return signals;
}

/** Overskriften øverst: hvor mange ting skal ordnes. */
export function tilsynHeadline(signals: TilsynSignal[]): { tone: SignalTone; text: string } {
  const kritisk = signals.filter((s) => s.tone === 'kritisk').length;
  const obs = signals.filter((s) => s.tone === 'obs').length;
  if (kritisk === 0 && obs === 0) return { tone: 'ok', text: 'I er klar. Intet kræver handling.' };
  if (kritisk > 0)
    return {
      tone: 'kritisk',
      text: `${plural(kritisk, 'område', 'områder')} skal ordnes før et tilsyn${
        obs > 0 ? `, og ${obs} bør ses på` : ''
      }.`,
    };
  return { tone: 'obs', text: `Næsten klar. ${plural(obs, 'område', 'områder')} bør ses på.` };
}

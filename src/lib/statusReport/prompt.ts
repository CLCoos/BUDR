import { VUM_FUNCTION_LEVEL_LABELS } from '@/lib/vum/vumThemes';
import { CITATION_INSTRUCTION } from '@/lib/documents/citations';
import type { DocumentSectionDefinition } from '@/lib/documents/registry';
import type { SourceRef } from '@/lib/documents/types';
import type { StatusReportSources } from './types';

export const STATUS_REPORT_SYSTEM = `Du skriver ét afsnit af en statusudtalelse fra et socialpsykiatrisk botilbud (servicelovens §107/§108) til borgerens kommune (sagsbehandleren) før et opfølgningsmøde.

Regler:
- Skriv på dansk i et sagligt, konkret og respektfuldt sprog, recovery-orienteret og i 3. person ("borgeren").
- Brug KUN oplysninger fra kildematerialet. Opfind aldrig hændelser, mål, citater, diagnoser eller tal.
- Mangler der oplysninger, så skriv en markering i firkantede parenteser, fx "[Udfyldes af personalet: …]".
- Skriv kun afsnittets brødtekst uden overskrift. Ingen markdown ud over punktopstillinger med "- ".
- Nævn ikke personalets navne og henvis ikke til "kildematerialet" eller "journalen" som sådan; skriv fx "personalet har observeret".
- Hold afsnittet kort og læsevenligt: typisk 80–250 ord.

${CITATION_INSTRUCTION}`;

const MAX_JOURNAL_CHARS = 30000;
const MAX_ENTRY_CHARS = 700;
const MAX_CHECKIN_TEXTS = 40;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Erstatter borgerens navne med "Borgeren", så navnet ikke sendes til AI-tjenesten. */
export function pseudonymize(text: string, names: string[]): string {
  let out = text;
  const unique = [...new Set(names.map((n) => n.trim()).filter((n) => n.length >= 2))].sort(
    (a, b) => b.length - a.length
  );
  for (const name of unique) {
    const re = new RegExp(`(?<![\\p{L}])${escapeRegExp(name)}(?![\\p{L}])`, 'giu');
    out = out.replace(re, 'Borgeren');
  }
  return out;
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Jævn udtynding, så hele perioden er repræsenteret, når der er for meget tekst. */
export function thinEvenly<T>(items: T[], size: (item: T) => number, budget: number): T[] {
  const total = items.reduce((sum, i) => sum + size(i), 0);
  if (total <= budget || items.length === 0) return items;
  const keepRatio = budget / total;
  const step = 1 / keepRatio;
  const out: T[] = [];
  for (let pos = 0; pos < items.length; pos += step) {
    out.push(items[Math.floor(pos)]);
  }
  return out;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

export type SourceMaterial = { text: string; refs: Map<string, SourceRef> };

/**
 * Bygger kildeteksten til modellen. Hvert enkelt element (notat, check-in, bekymring, krise,
 * næste skridt) får en kode, så modellen kan henvise til det, og vi kan vise kilden ved afsnittet.
 */
export function buildSourceMaterial(src: StatusReportSources): SourceMaterial {
  const parts: string[] = [];
  const refs = new Map<string, SourceRef>();
  const counters: Record<string, number> = {};
  const addRef = (
    prefix: string,
    kind: SourceRef['kind'],
    date: string | null,
    label: string,
    excerpt: string
  ): string => {
    counters[prefix] = (counters[prefix] ?? 0) + 1;
    const ref = `${prefix}${counters[prefix]}`;
    refs.set(ref, { ref, kind, date, label, excerpt: clip(excerpt, 240) });
    return `[${ref}]`;
  };
  parts.push(`Periode: ${src.periodStart} til ${src.periodEnd}`);

  if (src.vum) {
    parts.push('## VUM-vurdering');
    if (src.vum.casePurpose) parts.push(`Indsatsformål: ${clip(src.vum.casePurpose, 1500)}`);
    if (src.vum.referralSource) parts.push(`Henvisning: ${clip(src.vum.referralSource, 800)}`);
    for (const t of src.vum.themes) {
      const level = t.level !== undefined ? VUM_FUNCTION_LEVEL_LABELS[t.level] : 'ikke vurderet';
      const lines = [t.notes, ...t.answers].filter(Boolean).map((x) => clip(String(x), 800));
      parts.push(`Tema ${t.number}. ${t.title} (${t.categoryLabel}) – niveau: ${level}`);
      if (lines.length > 0) parts.push(lines.map((l) => `  ${l}`).join('\n'));
    }
    if (src.vum.goals.length > 0) {
      parts.push('### VUM-mål');
      for (const g of src.vum.goals) {
        parts.push(
          `- ${g.title} (status: ${g.status}${g.target_date ? `, måldato ${g.target_date}` : ''})${
            g.description ? `: ${clip(g.description, 600)}` : ''
          }`
        );
      }
    }
  } else {
    parts.push('## VUM-vurdering\n(ingen VUM-vurdering registreret)');
  }

  parts.push('## Aftalte næste skridt (fra Lys)');
  if (src.nextSteps.length === 0) parts.push('(ingen)');
  for (const s of src.nextSteps) {
    const code = addRef(
      'S',
      'naeste_skridt',
      s.completedAt ? s.completedAt.slice(0, 10) : s.targetDate,
      'Næste skridt',
      `${s.title}${s.residentNote ? ` – "${s.residentNote}"` : ''}`
    );
    const notes = [
      s.residentNote ? `borgerens note: "${clip(s.residentNote, 400)}"` : null,
      s.staffNote ? `personalets note: ${clip(s.staffNote, 400)}` : null,
    ]
      .filter(Boolean)
      .join('; ');
    parts.push(
      `- ${code} ${s.title} (status: ${s.status}${s.completedAt ? `, fuldført ${s.completedAt.slice(0, 10)}` : ''})${
        s.description ? `: ${clip(s.description, 400)}` : ''
      }${notes ? ` [${notes}]` : ''}`
    );
  }

  parts.push('## Trivsel fra borgerens check-ins (1–10)');
  if (src.checkins.length === 0) {
    parts.push('(ingen check-ins i perioden)');
  } else {
    const byMonth = new Map<string, number[]>();
    for (const c of src.checkins) {
      const k = monthKey(c.date);
      byMonth.set(k, [...(byMonth.get(k) ?? []), c.mood]);
    }
    for (const [m, moods] of [...byMonth.entries()].sort()) {
      parts.push(`- ${m}: gennemsnit ${average(moods)} (${moods.length} check-ins)`);
    }
    const texts = src.checkins.filter((c) => c.text && c.text.trim());
    const sample = thinEvenly(texts, () => 1, MAX_CHECKIN_TEXTS);
    if (sample.length > 0) {
      parts.push('### Borgerens egne ord i check-ins');
      for (const c of sample) {
        const code = addRef('C', 'checkin', c.date, `Check-in (humør ${c.mood})`, c.text ?? '');
        parts.push(`- ${code} ${c.date}: "${clip(c.text ?? '', 300)}"`);
      }
    }
  }

  parts.push('## Personalets godkendte journalnotater');
  if (src.journal.length === 0) parts.push('(ingen godkendte notater i perioden)');
  const journal = thinEvenly(
    src.journal.map((j) => ({ ...j, text: clip(j.text, MAX_ENTRY_CHARS) })),
    (j) => j.text.length + 30,
    MAX_JOURNAL_CHARS
  );
  for (const j of journal) {
    const code = addRef('J', 'journal', j.date, j.category, j.text);
    parts.push(`- ${code} ${j.date} (${j.category}): ${j.text}`);
  }

  parts.push('## Bekymringsnotater');
  if (src.concerns.length === 0) parts.push('(ingen)');
  for (const c of src.concerns) {
    const code = addRef('B', 'bekymring', c.date, `Bekymring: ${c.category}`, c.note);
    parts.push(`- ${code} ${c.date} (${c.category}, alvor ${c.severity}/10): ${clip(c.note, 500)}`);
  }

  parts.push('## Kriseforløb');
  if (src.crises.length === 0) parts.push('(ingen)');
  for (const c of src.crises) {
    const code = addRef('K', 'krise', c.date, `Krise, trin ${c.trin}`, c.notes ?? c.status);
    parts.push(
      `- ${code} ${c.date}: krisetrin ${c.trin}, ${c.status}${c.notes ? `: ${clip(c.notes, 400)}` : ''}`
    );
  }

  parts.push('## Medicin');
  if (src.medications.length === 0) parts.push('(ingen registreret)');
  for (const m of src.medications) {
    parts.push(
      `- ${m.name} ${m.dose}, ${m.frequency} (${m.status}${m.since ? `, oprettet ${m.since.slice(0, 10)}` : ''})`
    );
  }

  return { text: pseudonymize(parts.join('\n'), src.residentNames), refs };
}

export function buildSectionUserMessage(
  section: DocumentSectionDefinition,
  sourceText: string
): string {
  return `Afsnit: ${section.title}

Instruks for afsnittet:
${section.instruction ?? ''}

Kildemateriale:
${sourceText}`;
}

/** Rydder modellens svar: fjerner overskrift, fede markeringer og overflødige tomme linjer. */
export function cleanSectionText(raw: string, title: string): string {
  let t = raw.trim();
  const firstLine =
    t
      .split('\n')[0]
      ?.replace(/^#+\s*/, '')
      .replace(/\*\*/g, '')
      .trim() ?? '';
  if (firstLine.toLowerCase() === title.toLowerCase()) {
    t = t.split('\n').slice(1).join('\n');
  }
  return t
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^\* /gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

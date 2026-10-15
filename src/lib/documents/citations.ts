import type { SourceRef } from './types';

/** Kildekoder i AI-svar: [[J3]] eller [[J3, C12]]. */
const CITATION_RE = /\s*\[\[([A-Z]\d{1,4}(?:\s*,\s*[A-Z]\d{1,4})*)\]\]/g;

export const CITATION_INSTRUCTION = `Kildehenvisninger:
- Hver oplysning i kildematerialet har en kode i firkantede parenteser, fx [J3] eller [C12].
- Sæt koderne for de kilder, du bygger på, efter hver sætning eller hvert punkt i formatet [[J3]] eller [[J3, C12]].
- Brug kun koder, der står i kildematerialet. Sætninger uden kilde (fx markeringer til personalet) får ingen kode.`;

/**
 * Fjerner [[…]]-henvisninger fra modellens tekst og returnerer de kilder, der faktisk findes,
 * i den rækkefølge de først nævnes. Ukendte koder ignoreres.
 */
export function extractCitations(
  text: string,
  refs: ReadonlyMap<string, SourceRef>
): { text: string; sources: SourceRef[] } {
  const seen = new Set<string>();
  const sources: SourceRef[] = [];
  const clean = text.replace(CITATION_RE, (_m, codes: string) => {
    for (const code of codes.split(',').map((c) => c.trim())) {
      const ref = refs.get(code);
      if (ref && !seen.has(code)) {
        seen.add(code);
        sources.push(ref);
      }
    }
    return '';
  });
  return {
    text: clean
      .replace(/[ \t]+\n/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim(),
    sources,
  };
}

/** Sorterer kilder kronologisk til visning. */
export function sortSources(sources: SourceRef[]): SourceRef[] {
  return [...sources].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

const SOURCE_KINDS = new Set<SourceRef['kind']>([
  'journal',
  'checkin',
  'bekymring',
  'krise',
  'naeste_skridt',
]);

function str(v: unknown, max: number): string | null {
  return typeof v === 'string' ? v.slice(0, max) : null;
}

/** Validerer kilder sendt fra klienten: kendte afsnit, kendte typer, korte felter, højst 200 pr. afsnit. */
export function sanitizeSectionSources(
  sectionKeys: readonly string[],
  raw: unknown
): Record<string, SourceRef[]> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const keys = new Set(sectionKeys);
  const out: Record<string, SourceRef[]> = {};
  for (const [k, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!keys.has(k) || !Array.isArray(list)) continue;
    const clean: SourceRef[] = [];
    for (const item of list.slice(0, 200)) {
      if (typeof item !== 'object' || item === null) continue;
      const o = item as Record<string, unknown>;
      const ref = str(o.ref, 8);
      const kind = o.kind as SourceRef['kind'];
      if (!ref || !/^[A-Z]\d{1,4}$/.test(ref) || !SOURCE_KINDS.has(kind)) continue;
      const date = str(o.date, 10);
      clean.push({
        ref,
        kind,
        date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
        label: str(o.label, 120) ?? '',
        excerpt: str(o.excerpt, 260) ?? '',
      });
    }
    out[k] = clean;
  }
  return out;
}

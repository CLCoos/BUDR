/**
 * Alle borgerdokumenter i BUDR. Hver type beskriver sine afsnit, metadata og frister;
 * motoren (database, godkendelse, versioner, kilder, eksport) er fælles.
 * En type vises først i portalen, når `available` er true.
 */
import { STATUS_REPORT_SECTIONS } from '@/lib/statusReport/sections';
import type { DocumentMeta, DocumentSections } from './types';

export const DOCUMENT_TYPE_KEYS = [
  'vum_bestilling',
  'statusrapport',
  'magtanvendelse',
  'tilsynsrapport',
  'indsatsplan',
  'krap_skema',
  'dagsstruktur',
  'sundhed',
  'dagbog',
  'kvikguide',
  'trafiklys',
] as const;

export type DocumentTypeKey = (typeof DOCUMENT_TYPE_KEYS)[number];

export type DocumentSectionDefinition = {
  key: string;
  title: string;
  help: string;
  /** Kan BUDR skrive et udkast ud fra data? */
  aiDraft: boolean;
  /** Afsnitsspecifik instruks til modellen. */
  instruction?: string;
};

export type MetaFieldDefinition = {
  key: string;
  label: string;
  kind: 'date' | 'text' | 'select';
  required?: boolean;
  options?: readonly string[];
  max?: number;
  placeholder?: string;
  /** Vises i dokumentets hoved ved print. */
  inHeader?: boolean;
};

export type DocumentTypeDefinition = {
  key: DocumentTypeKey;
  title: string;
  /** Én linje om hvad dokumentet bruges til. */
  description: string;
  /** Undertitel på det printede dokument. */
  printSubtitle: string;
  available: boolean;
  sections: readonly DocumentSectionDefinition[];
  metaFields: readonly MetaFieldDefinition[];
  /** Felter der sammen udgør dokumentets periode (bruges til kilder). */
  period?: { start: string; end: string };
  /** Standardfrist ud fra metadata, fx fem dage før mødet. */
  defaultDueDate?: (meta: DocumentMeta) => string | null;
};

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const planned = (
  key: DocumentTypeKey,
  title: string,
  description: string
): DocumentTypeDefinition => ({
  key,
  title,
  description,
  printSubtitle: '',
  available: false,
  sections: [],
  metaFields: [],
});

export const DOCUMENT_TYPES: Record<DocumentTypeKey, DocumentTypeDefinition> = {
  statusrapport: {
    key: 'statusrapport',
    title: 'Statusrapport',
    description: 'Statusudtalelse i VUM 2.0-format til kommunen før opfølgningsmødet.',
    printSubtitle: 'Statusudtalelse til brug ved opfølgning på indsatsen (VUM 2.0)',
    available: true,
    sections: STATUS_REPORT_SECTIONS,
    metaFields: [
      { key: 'period_start', label: 'Periode fra', kind: 'date', required: true },
      { key: 'period_end', label: 'Periode til', kind: 'date', required: true },
      { key: 'meeting_date', label: 'Opfølgningsmøde', kind: 'date', inHeader: true },
      {
        key: 'paragraph',
        label: 'Paragraf',
        kind: 'select',
        options: ['§107', '§108', '§85', 'Andet'],
      },
      {
        key: 'contact_person',
        label: 'Kontaktperson',
        kind: 'text',
        max: 200,
        placeholder: 'Navn på kontaktpædagog',
        inHeader: true,
      },
    ],
    period: { start: 'period_start', end: 'period_end' },
    defaultDueDate: (meta) => (meta.meeting_date ? addDays(meta.meeting_date, -5) : null),
  },
  vum_bestilling: planned(
    'vum_bestilling',
    'VUM 2.0 Bestilling',
    'Kommunens bestilling og visiteringsgrundlag, læst ind i borgerens VUM.'
  ),
  magtanvendelse: planned(
    'magtanvendelse',
    'Magtanvendelse',
    'Indberetning af magtanvendelse til kommunen inden for fristen.'
  ),
  tilsynsrapport: planned(
    'tilsynsrapport',
    'Kvalitets- og tilsynsrapport',
    'Bostedets dokumentation til Socialtilsynet efter kvalitetsmodellen.'
  ),
  indsatsplan: planned(
    'indsatsplan',
    'Pædagogisk indsatsplan',
    'Delmål og indsatser, aftalt med borgeren og fulgt op hver måned.'
  ),
  krap_skema: planned(
    'krap_skema',
    'KRAP-skema',
    'Søjleskema, registreringsskema og ressourceblomst.'
  ),
  dagsstruktur: planned(
    'dagsstruktur',
    'Dagsstruktur',
    'Borgerens faste uge med aftaler, medicin og aktiviteter.'
  ),
  sundhed: planned(
    'sundhed',
    'Medicin og sundhed',
    'Resumé af medicin, udleveringer og observationer til lægen.'
  ),
  dagbog: planned('dagbog', 'Dagbogsnotat', 'Dagligt fagligt notat koblet til delmål.'),
  kvikguide: planned(
    'kvikguide',
    'Kvik-guide',
    'Én side til vikarer: hvad er vigtigt, hvad hjælper, hvad skal man undgå.'
  ),
  trafiklys: planned(
    'trafiklys',
    'Trafiklys og konfliktplan',
    'Grøn, gul og rød med tegn og handlinger, lavet sammen med borgeren.'
  ),
};

export function isDocumentTypeKey(v: unknown): v is DocumentTypeKey {
  return typeof v === 'string' && (DOCUMENT_TYPE_KEYS as readonly string[]).includes(v);
}

export function getDocumentType(key: string): DocumentTypeDefinition | undefined {
  return isDocumentTypeKey(key) ? DOCUMENT_TYPES[key] : undefined;
}

export function availableDocumentTypes(): DocumentTypeDefinition[] {
  return DOCUMENT_TYPE_KEYS.map((k) => DOCUMENT_TYPES[k]).filter((t) => t.available);
}

export function getSection(
  type: DocumentTypeDefinition,
  key: string
): DocumentSectionDefinition | undefined {
  return type.sections.find((s) => s.key === key);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Fjerner ukendte afsnit og ikke-tekst; begrænser længde pr. afsnit. */
export function sanitizeSections(
  type: DocumentTypeDefinition,
  raw: unknown,
  maxLen = 12000
): DocumentSections {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const keys = new Set(type.sections.map((s) => s.key));
  const out: DocumentSections = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (keys.has(k) && typeof v === 'string') out[k] = v.slice(0, maxLen);
  }
  return out;
}

export type MetaResult = { ok: true; meta: DocumentMeta } | { ok: false; error: string };

/**
 * Validerer metadata efter typens felter. Ukendte nøgler fjernes, tom tekst bliver null.
 * `partial` = kun de felter der er sendt (PATCH); ellers kræves alle obligatoriske felter.
 */
export function sanitizeMeta(
  type: DocumentTypeDefinition,
  raw: unknown,
  partial = false
): MetaResult {
  const input =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const meta: DocumentMeta = {};
  for (const f of type.metaFields) {
    if (!(f.key in input)) {
      if (!partial && f.required) return { ok: false, error: `${f.label} mangler` };
      continue;
    }
    const v = input[f.key];
    if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) {
      if (f.required) return { ok: false, error: `${f.label} mangler` };
      meta[f.key] = null;
      continue;
    }
    if (typeof v !== 'string') return { ok: false, error: `Ugyldig værdi i ${f.label}` };
    const t = v.trim();
    if (f.kind === 'date' && !isValidDate(t))
      return { ok: false, error: `Ugyldig dato i ${f.label}` };
    if (f.kind === 'select' && f.options && !f.options.includes(t)) {
      return { ok: false, error: `Ugyldig værdi i ${f.label}` };
    }
    meta[f.key] = f.kind === 'text' ? t.slice(0, f.max ?? 500) : t;
  }
  return { ok: true, meta };
}

/** Tjekker at periodens slut ikke ligger før start. */
export function validatePeriod(type: DocumentTypeDefinition, meta: DocumentMeta): string | null {
  if (!type.period) return null;
  const start = meta[type.period.start];
  const end = meta[type.period.end];
  if (start && end && end < start) return 'Perioden slutter før den starter';
  return null;
}

/** Afsnit der mangler tekst (eller stadig har markeringer, som personalet skal udfylde). */
export function incompleteSections(
  type: DocumentTypeDefinition,
  sections: DocumentSections
): { missing: string[]; placeholders: string[] } {
  const missing: string[] = [];
  const placeholders: string[] = [];
  for (const s of type.sections) {
    const text = (sections[s.key] ?? '').trim();
    if (!text) missing.push(s.title);
    else if (
      /\[(Udfyldes af personalet|Personalet tager stilling|Gennemgås med borgeren)[^\]]*\]/i.test(
        text
      )
    ) {
      placeholders.push(s.title);
    }
  }
  return { missing, placeholders };
}

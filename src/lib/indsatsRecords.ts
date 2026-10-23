/** Magtanvendelse / indsatsdokumentation (serviceloven). Live rows live in `care_indsats_records`. */
import type { SupabaseClient } from '@supabase/supabase-js';

export const INDSATS_TYPES = [
  '§136_fastholdelse',
  '§136_tilbageholdelse',
  '§141_personlig_hygiejne',
  '§141_ernæring',
  '§141_beskyttelse',
  'observation',
  'hændelse',
] as const;

export type IndsatsType = (typeof INDSATS_TYPES)[number];

export type IndsatsRecord = {
  id: string;
  created_at: string;
  type: IndsatsType;
  paragraph: string;
  tidspunkt: string;
  varighed: string;
  involverede_borgere: string;
  involverede_personale: string;
  beskrivelse: string;
  forudgaaende: string;
  handling: string;
  borgerens_reaktion: string;
  opfoelgning: string;
  underskrift: string;
};

export type IndsatsFormFields = Omit<IndsatsRecord, 'id' | 'created_at' | 'paragraph'>;

export const INDSATS_TYPE_OPTIONS: {
  value: IndsatsType;
  label: string;
  paragraph: string;
  color: string;
}[] = [
  { value: '§136_fastholdelse', label: 'Fastholdelse', paragraph: '§136', color: '#dc2626' },
  { value: '§136_tilbageholdelse', label: 'Tilbageholdelse', paragraph: '§136', color: '#dc2626' },
  {
    value: '§141_personlig_hygiejne',
    label: 'Personlig hygiejne',
    paragraph: '§141',
    color: '#d97706',
  },
  { value: '§141_ernæring', label: 'Ernæring', paragraph: '§141', color: '#d97706' },
  {
    value: '§141_beskyttelse',
    label: 'Beskyttelse mod skade',
    paragraph: '§141',
    color: '#d97706',
  },
  { value: 'observation', label: 'Observationsnotat', paragraph: '', color: '#6366f1' },
  { value: 'hændelse', label: 'Hændelsesrapport', paragraph: '', color: '#64748b' },
];

/** v2: demoens eksempler følger borgernes historie (ingen magtanvendelser). v1 slettes ved første læsning. */
export const INDSATS_DEMO_STORAGE_KEY = 'budr_indsats_records_v2';
const INDSATS_DEMO_LEGACY_KEYS = ['budr_indsats_records_v1'];

export function isIndsatsType(value: unknown): value is IndsatsType {
  return typeof value === 'string' && (INDSATS_TYPES as readonly string[]).includes(value);
}

export function paragraphForIndsatsType(type: IndsatsType): string {
  return INDSATS_TYPE_OPTIONS.find((t) => t.value === type)?.paragraph ?? '';
}

export function requiredIndsatsFieldsMissing(form: IndsatsFormFields): string[] {
  const missing: string[] = [];
  if (!form.beskrivelse.trim()) missing.push('beskrivelse');
  if (!form.involverede_borgere.trim()) missing.push('involverede_borgere');
  if (!form.underskrift.trim()) missing.push('underskrift');
  if (!form.tidspunkt.trim()) missing.push('tidspunkt');
  if (!isIndsatsType(form.type)) missing.push('type');
  return missing;
}

export function canSaveIndsatsForm(form: IndsatsFormFields): boolean {
  return requiredIndsatsFieldsMissing(form).length === 0;
}

export function buildIndsatsInsertRow(
  form: IndsatsFormFields,
  args: { orgId: string; createdBy: string }
): Record<string, unknown> {
  return {
    org_id: args.orgId,
    created_by: args.createdBy,
    type: form.type,
    paragraph: paragraphForIndsatsType(form.type),
    tidspunkt: form.tidspunkt.trim(),
    varighed: form.varighed.trim(),
    involverede_borgere: form.involverede_borgere.trim(),
    involverede_personale: form.involverede_personale.trim(),
    beskrivelse: form.beskrivelse.trim(),
    forudgaaende: form.forudgaaende.trim(),
    handling: form.handling.trim(),
    borgerens_reaktion: form.borgerens_reaktion.trim(),
    opfoelgning: form.opfoelgning.trim(),
    underskrift: form.underskrift.trim(),
  };
}

/** Til print-vinduet, som deler origin med portalen: alt brugerindhold escapes. */
export function escapeIndsatsHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function parseIndsatsRecord(row: Record<string, unknown>): IndsatsRecord | null {
  if (!isIndsatsType(row.type)) return null;
  const id = typeof row.id === 'string' ? row.id : null;
  if (!id) return null;
  const createdAt = typeof row.created_at === 'string' ? row.created_at : new Date().toISOString();
  const str = (key: string): string => (typeof row[key] === 'string' ? (row[key] as string) : '');
  return {
    id,
    created_at: createdAt,
    type: row.type,
    paragraph: str('paragraph') || paragraphForIndsatsType(row.type),
    tidspunkt: str('tidspunkt'),
    varighed: str('varighed'),
    involverede_borgere: str('involverede_borgere'),
    involverede_personale: str('involverede_personale'),
    beskrivelse: str('beskrivelse'),
    forudgaaende: str('forudgaaende'),
    handling: str('handling'),
    borgerens_reaktion: str('borgerens_reaktion'),
    opfoelgning: str('opfoelgning'),
    underskrift: str('underskrift'),
  };
}

/** Tidspunkt `daysAgo` dage før `now`, kl. hh:mm lokal tid, som `datetime-local`-streng. */
function demoLocalStamp(now: Date, daysAgo: number, hh: number, mm: number): string {
  const t = new Date(now);
  t.setDate(t.getDate() - daysAgo);
  t.setHours(hh, mm, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(hh)}:${pad(mm)}`;
}

/**
 * Demoens tre indsatsnotater. De følger samme historie som Vagt-forsiden og forløbssiderne
 * (SK's svære nat for 8 dage siden, CB's urolige aften, MT's afslåede aftenmedicin).
 * Ingen magtanvendelser: det er det almindelige billede på et §107-bosted.
 */
export function buildDemoIndsatsRecords(now: Date = new Date()): IndsatsRecord[] {
  const rec = (
    id: string,
    type: IndsatsType,
    stamp: string,
    fields: Omit<IndsatsFormFields, 'type' | 'tidspunkt'>
  ): IndsatsRecord => ({
    id,
    created_at: new Date(stamp).toISOString(),
    type,
    paragraph: paragraphForIndsatsType(type),
    tidspunkt: stamp,
    ...fields,
  });
  return [
    rec('demo-indsats-mt', 'hændelse', demoLocalStamp(now, 1, 22, 0), {
      varighed: '10 min',
      involverede_borgere: 'MT',
      involverede_personale: 'Jonas N. (nattevagt)',
      beskrivelse: 'MT afslog sin aftenmedicin kl. 22. Han sagde, at han bliver «tung» af den.',
      forudgaaende: 'Rolig aften. Tredje afslag om aftenen på to uger, ingen afslag om morgenen.',
      handling:
        'Tilbød medicinen igen kl. 22.30 uden pres. MT sagde stadig nej, og det blev respekteret. Afslaget er noteret i medicinlisten.',
      borgerens_reaktion: 'MT var rolig og sov kl. 23.30.',
      opfoelgning:
        'Lægesamtale om aftenmedicinen fredag. Kontaktperson Lars N. forbereder samtalen med MT.',
      underskrift: 'Jonas N.',
    }),
    rec('demo-indsats-cb', 'observation', demoLocalStamp(now, 1, 21, 50), {
      varighed: '30 min',
      involverede_borgere: 'CB',
      involverede_personale: 'Peter N.',
      beskrivelse: 'Urolig aften. CB kunne ikke falde til ro på grund af larm fra den nye nabo.',
      forudgaaende: 'CB har været gul i Lys tre dage i træk og sovet dårligt.',
      handling:
        'Støttende samtale i fællesstuen med en kop te. Vi talte om, hvad der hjælper hende til at sove.',
      borgerens_reaktion: 'CB blev roligere og sov kl. 23.',
      opfoelgning: 'Samtale om søvn i morgen kl. 11. Tal med naboen om støj efter kl. 22.',
      underskrift: 'Peter N.',
    }),
    rec('demo-indsats-sk', 'hændelse', demoLocalStamp(now, 8, 2, 14), {
      varighed: '45 min',
      involverede_borgere: 'SK',
      involverede_personale: 'Jonas N. (nattevagt)',
      beskrivelse: 'SK skrev til Lys kl. 02.14, at hun ikke kunne sove og havde det svært.',
      forudgaaende:
        'Dagen efter mors besøg. SK har tidligere haft svære dage 1-3 dage efter besøg.',
      handling:
        'Nattevagten bankede på og tilbød at sidde hos hende. Tryghedsplanen blev brugt: varm drik, lys tændt og en rolig snak.',
      borgerens_reaktion: 'SK faldt til ro og sov kl. 03.',
      opfoelgning:
        'Kontaktperson Peter N. talte med SK dagen efter. Fast aftale dagen efter mors næste besøg.',
      underskrift: 'Jonas N.',
    }),
  ];
}

export function loadDemoIndsatsRecords(): IndsatsRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    for (const key of INDSATS_DEMO_LEGACY_KEYS) window.localStorage.removeItem(key);
    const raw = window.localStorage.getItem(INDSATS_DEMO_STORAGE_KEY);
    if (!raw) {
      const seeded = buildDemoIndsatsRecords();
      saveDemoIndsatsRecords(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => parseIndsatsRecord((row ?? {}) as Record<string, unknown>))
      .filter((row): row is IndsatsRecord => row !== null);
  } catch {
    return buildDemoIndsatsRecords();
  }
}

export function saveDemoIndsatsRecords(records: IndsatsRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(INDSATS_DEMO_STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* ignore quota / private mode */
  }
}

export const INDSATS_SELECT =
  'id, created_at, type, paragraph, tidspunkt, varighed, involverede_borgere, involverede_personale, beskrivelse, forudgaaende, handling, borgerens_reaktion, opfoelgning, underskrift';

export function isMagtanvendelse(r: Pick<IndsatsRecord, 'paragraph'>): boolean {
  return /^§\s?(136|141)$/.test(r.paragraph.trim());
}

/** Gemte registreringer for organisationen, nyeste først. `since` er en ISO-dato. */
export async function fetchIndsatsRecords(
  supabase: SupabaseClient,
  orgId: string,
  since?: string
): Promise<{ records: IndsatsRecord[]; error: string | null }> {
  let query = supabase.from('care_indsats_records').select(INDSATS_SELECT).eq('org_id', orgId);
  if (since) query = query.gte('created_at', since);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return { records: [], error: error.message };
  return {
    records: (data ?? [])
      .map((row) => parseIndsatsRecord(row as Record<string, unknown>))
      .filter((row): row is IndsatsRecord => row !== null),
    error: null,
  };
}

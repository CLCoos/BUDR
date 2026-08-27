/** Magtanvendelse / indsatsdokumentation (serviceloven). Live rows live in `care_indsats_records`. */

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

export const INDSATS_DEMO_STORAGE_KEY = 'budr_indsats_records_v1';

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
  args: { orgId: string; createdBy: string | null }
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

export function loadDemoIndsatsRecords(): IndsatsRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(INDSATS_DEMO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => parseIndsatsRecord((row ?? {}) as Record<string, unknown>))
      .filter((row): row is IndsatsRecord => row !== null);
  } catch {
    return [];
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

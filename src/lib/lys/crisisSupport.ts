/** Cookie-resident crisis-card payload (plan + facility contacts + current on-call). */

export type OnCallShift = 'day' | 'evening' | 'night';

export type CrisisStep = { icon?: string; title?: string; description?: string };

export type CrisisPlanPayload = {
  warning_signs: string[];
  helpful_strategies: string[];
  steps: CrisisStep[];
};

export type FacilityContactPayload = {
  id: string;
  label: string;
  phone: string;
  available_hours: string | null;
};

export type OnCallPayload = {
  id: string;
  phone: string;
  shift: OnCallShift;
};

export type CrisisSupportPayload = {
  crisisPlan: CrisisPlanPayload | null;
  contacts: FacilityContactPayload[];
  onCall: OnCallPayload | null;
  demo?: boolean;
};

const DK = 'Europe/Copenhagen';

function copenhagenHour(ref: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DK,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(ref);
  const raw = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  if (!Number.isFinite(raw)) return 0;
  return raw === 24 ? 0 : raw;
}

/** Same windows as the previous client lookup, but in Europe/Copenhagen (not UTC/server local). */
export function currentOnCallShift(ref = new Date()): OnCallShift {
  const hour = copenhagenHour(ref);
  if (hour >= 6 && hour < 14) return 'day';
  if (hour >= 14 && hour < 22) return 'evening';
  return 'night';
}

export function emptyCrisisSupportPayload(opts?: { demo?: boolean }): CrisisSupportPayload {
  return {
    crisisPlan: null,
    contacts: [],
    onCall: null,
    ...(opts?.demo ? { demo: true } : {}),
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function asCrisisSteps(value: unknown): CrisisStep[] {
  if (!Array.isArray(value)) return [];
  const steps: CrisisStep[] = [];
  for (const item of value) {
    if (item === null || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const step: CrisisStep = {};
    if (typeof row.icon === 'string' && row.icon.trim()) step.icon = row.icon.trim();
    if (typeof row.title === 'string' && row.title.trim()) step.title = row.title.trim();
    if (typeof row.description === 'string' && row.description.trim()) {
      step.description = row.description.trim();
    }
    if (step.icon || step.title || step.description) steps.push(step);
  }
  return steps;
}

export function normalizeCrisisPlan(row: unknown): CrisisPlanPayload | null {
  if (row === null || typeof row !== 'object') return null;
  const data = row as Record<string, unknown>;
  const warning_signs = asStringArray(data.warning_signs);
  const helpful_strategies = asStringArray(data.helpful_strategies);
  const steps = asCrisisSteps(data.steps);
  if (warning_signs.length === 0 && helpful_strategies.length === 0 && steps.length === 0) {
    return null;
  }
  return { warning_signs, helpful_strategies, steps };
}

export function normalizeFacilityContacts(rows: unknown): FacilityContactPayload[] {
  if (!Array.isArray(rows)) return [];
  const contacts: FacilityContactPayload[] = [];
  for (const item of rows) {
    if (item === null || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== 'string' ||
      typeof row.label !== 'string' ||
      typeof row.phone !== 'string'
    ) {
      continue;
    }
    const phone = row.phone.trim();
    const label = row.label.trim();
    if (!phone || !label) continue;
    contacts.push({
      id: row.id,
      label,
      phone,
      available_hours: typeof row.available_hours === 'string' ? row.available_hours : null,
    });
  }
  return contacts;
}

export function normalizeOnCall(row: unknown): OnCallPayload | null {
  if (row === null || typeof row !== 'object') return null;
  const data = row as Record<string, unknown>;
  const shift = data.shift;
  if (shift !== 'day' && shift !== 'evening' && shift !== 'night') return null;
  if (typeof data.id !== 'string' || typeof data.phone !== 'string') return null;
  const phone = data.phone.trim();
  if (!phone) return null;
  return { id: data.id, phone, shift };
}

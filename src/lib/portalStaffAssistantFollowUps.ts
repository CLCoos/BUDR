/** Tilladte genveje fra Faglig støtte — mappes til portal-ruter (live vs demo). */

export const STAFF_ASSISTANT_FOLLOW_UP_KEYS = [
  'indsatsdok',
  'dataimport',
  'beboere',
  'journal',
  'handover',
  'tilsyn',
  'settings',
] as const;

export type StaffAssistantFollowUpKey = (typeof STAFF_ASSISTANT_FOLLOW_UP_KEYS)[number];

export type StaffAssistantFollowUp = {
  key: StaffAssistantFollowUpKey;
  /** Kort forklaring til brugeren (fx hvorfor det er relevant). */
  reason: string;
  /** Forudfylder dokumentsøgning i topbaren (`?q=`) når det giver mening. */
  searchQuery?: string;
  /** Dyb link til en konkret beboers 360° (kun sammen med key beboere eller journal). */
  resident360Id?: string;
  /**
   * Fane ved dybt link: live = overblik | medicin | dagsplan | plan | haven;
   * demo = overview | notes | goals | medication | aftaler.
   */
  residentTab?: string;
};

const LIVE_RESIDENT_TABS = new Set(['overblik', 'medicin', 'dagsplan', 'plan', 'haven']);
const DEMO_RESIDENT_TABS = new Set(['overview', 'notes', 'goals', 'medication', 'aftaler']);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeSearchQuery(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return undefined;
  return s.slice(0, 120);
}

function sanitizeResident360Id(raw: unknown, demoMode: boolean): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const s = raw.trim();
  if (!s || s.length > 80) return undefined;
  if (demoMode) {
    return /^res-\d{3}$/i.test(s) ? s.toLowerCase() : undefined;
  }
  return UUID_RE.test(s) ? s : undefined;
}

function sanitizeResidentTab(raw: unknown, demoMode: boolean): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  if (demoMode) return DEMO_RESIDENT_TABS.has(t) ? t : undefined;
  return LIVE_RESIDENT_TABS.has(t) ? t : undefined;
}

function mergeQueryOntoPath(path: string, extra: Record<string, string | undefined>): string {
  const qMark = path.indexOf('?');
  const pathname = qMark === -1 ? path : path.slice(0, qMark);
  const sp = new URLSearchParams(qMark === -1 ? '' : path.slice(qMark + 1));
  for (const [k, v] of Object.entries(extra)) {
    if (v != null && v !== '') sp.set(k, v);
  }
  const q = sp.toString();
  return q ? `${pathname}?${q}` : pathname;
}

const KEY_SET = new Set<string>(STAFF_ASSISTANT_FOLLOW_UP_KEYS);

const SHORT_LABELS: Record<StaffAssistantFollowUpKey, string> = {
  indsatsdok: 'Indsatsdokumentation',
  dataimport: 'Dataimport',
  beboere: 'Beboere',
  journal: 'Journal',
  handover: 'Vagtoverdragelse',
  tilsyn: 'Tilsynsrapport',
  settings: 'Indstillinger',
};

export function staffAssistantFollowUpLabel(key: StaffAssistantFollowUpKey): string {
  return SHORT_LABELS[key];
}

/** Primære steder for husets aftale- og pædagogiske dokumenter + beboerspecifikke aftaler. */
export const DEFAULT_DOCUMENT_SHORTCUT_KEYS: StaffAssistantFollowUpKey[] = [
  'indsatsdok',
  'dataimport',
  'beboere',
  'journal',
];

function baseStaffAssistantFollowUpHref(key: StaffAssistantFollowUpKey, demoMode: boolean): string {
  if (demoMode) {
    switch (key) {
      case 'indsatsdok':
        return '/care-portal-demo/indsatsdok';
      case 'dataimport':
        return '/care-portal-demo/import';
      case 'beboere':
        return '/care-portal-demo/residents';
      case 'journal':
        return '/care-portal-demo?tab=journal';
      case 'handover':
        return '/care-portal-demo/handover';
      case 'tilsyn':
        return '/care-portal-demo/tilsynsrapport';
      case 'settings':
        return '/care-portal-demo/settings';
      default:
        return '/care-portal-demo';
    }
  }
  switch (key) {
    case 'indsatsdok':
      return '/care-portal-indsatsdok';
    case 'dataimport':
      return '/care-portal-import';
    case 'beboere':
      return '/resident-360-view';
    case 'journal':
      return '/care-portal-dashboard?tab=journal';
    case 'handover':
      return '/handover-workspace';
    case 'tilsyn':
      return '/care-portal-tilsynsrapport';
    case 'settings':
      return '/care-portal-settings';
    default:
      return '/care-portal-dashboard';
  }
}

/** Fuld href inkl. valgfri `q`, dybe 360°-links m.m. */
export function staffAssistantFollowUpHref(
  followUp: StaffAssistantFollowUp,
  demoMode: boolean
): string {
  const { key } = followUp;
  let path = baseStaffAssistantFollowUpHref(key, demoMode);
  const qText = sanitizeSearchQuery(followUp.searchQuery);
  const rid = sanitizeResident360Id(followUp.resident360Id, demoMode);
  const tab = sanitizeResidentTab(followUp.residentTab, demoMode);

  if (rid && (key === 'beboere' || key === 'journal')) {
    if (demoMode) {
      path = `/care-portal-demo/residents/${encodeURIComponent(rid)}`;
    } else {
      path = `/resident-360-view/${encodeURIComponent(rid)}`;
    }
    const defaultTab = demoMode ? 'overview' : 'overblik';
    return mergeQueryOntoPath(path, { tab: tab ?? defaultTab, q: qText });
  }

  return qText ? mergeQueryOntoPath(path, { q: qText }) : path;
}

export function resolveStaffAssistantFollowUpHref(
  key: StaffAssistantFollowUpKey,
  demoMode: boolean
): string {
  return staffAssistantFollowUpHref({ key, reason: '' }, demoMode);
}

function isFollowUpKey(k: unknown): k is StaffAssistantFollowUpKey {
  return typeof k === 'string' && KEY_SET.has(k);
}

function normalizeFollowUps(raw: unknown): StaffAssistantFollowUp[] {
  if (!Array.isArray(raw)) return [];
  const out: StaffAssistantFollowUp[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (out.length >= 4) break;
    if (!item || typeof item !== 'object') continue;
    const key = (item as { key?: unknown }).key;
    const reason = (item as { reason?: unknown }).reason;
    if (!isFollowUpKey(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    const r =
      typeof reason === 'string' && reason.trim().length > 0
        ? reason.trim().slice(0, 160)
        : staffAssistantFollowUpLabel(key);
    const searchQuery = sanitizeSearchQuery((item as { searchQuery?: unknown }).searchQuery);
    const resident360Id = sanitizeResident360Id(
      (item as { resident360Id?: unknown }).resident360Id,
      false
    );
    const residentTab = sanitizeResidentTab((item as { residentTab?: unknown }).residentTab, false);
    const entry: StaffAssistantFollowUp = { key, reason: r };
    if (searchQuery) entry.searchQuery = searchQuery;
    if (resident360Id) entry.resident360Id = resident360Id;
    if (residentTab) entry.residentTab = residentTab;
    out.push(entry);
  }
  return out;
}

const FOLLOWUPS_OPEN = '<budr_followups>';
const FOLLOWUPS_CLOSE = '</budr_followups>';

/**
 * Fjerner `<budr_followups>...</budr_followups>` fra modeltekst og parser JSON-array.
 */
export function parseBudrFollowUpsBlock(fullText: string): {
  text: string;
  followUps: StaffAssistantFollowUp[];
} {
  const idx = fullText.indexOf(FOLLOWUPS_OPEN);
  const end = fullText.indexOf(FOLLOWUPS_CLOSE);
  if (idx === -1 || end === -1 || end <= idx) {
    return { text: fullText.trim(), followUps: [] };
  }
  const jsonPart = fullText.slice(idx + FOLLOWUPS_OPEN.length, end).trim();
  const before = fullText.slice(0, idx).trimEnd();
  const after = fullText.slice(end + FOLLOWUPS_CLOSE.length).trimStart();
  const text = [before, after].filter(Boolean).join('\n\n').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonPart) as unknown;
  } catch {
    const stripped = fullText.replace(/<budr_followups>[\s\S]*?<\/budr_followups>/gi, '').trim();
    return { text: stripped, followUps: [] };
  }

  return { text, followUps: normalizeFollowUps(parsed) };
}

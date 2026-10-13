import { copenhagenStartOfDateUtcIso, copenhagenYmd } from '@/lib/copenhagenDay';
import { isValidUuid } from '@/lib/uuid';

export const PLANNER_APPOINTMENT_TYPES = [
  'laege',
  'aktivitet',
  'intern',
  'transport',
  'andet',
] as const;

export type PlannerAppointmentType = (typeof PLANNER_APPOINTMENT_TYPES)[number];

export const PLANNER_HOUSES = ['A', 'B', 'C', 'D', 'TLS'] as const;
export type PlannerHouse = (typeof PLANNER_HOUSES)[number];

export const PLANNER_TITLE_MAX = 200;
export const PLANNER_LOCATION_MAX = 120;
export const PLANNER_RESPONSIBLE_MAX = 80;
export const PLANNER_DEFAULT_DURATION_MS = 60 * 60 * 1000;

export type PlannerEntryInsertRow = {
  org_id: string;
  title: string;
  category: PlannerAppointmentType;
  starts_at: string;
  ends_at: string;
  visible_to_resident: boolean;
  resident_user_id: string | null;
  location: string;
  responsible: string;
  house: PlannerHouse | '';
};

export type ParsedPlannerEntry = {
  id: string;
  title: string;
  type: PlannerAppointmentType;
  startsAtIso: string;
  residentUserId: string | null;
  location: string;
  responsible: string;
  house: PlannerHouse | null;
};

export function isPlannerAppointmentType(value: unknown): value is PlannerAppointmentType {
  return (
    typeof value === 'string' && (PLANNER_APPOINTMENT_TYPES as readonly string[]).includes(value)
  );
}

export function isPlannerHouse(value: unknown): value is PlannerHouse {
  return typeof value === 'string' && (PLANNER_HOUSES as readonly string[]).includes(value);
}

export function clipPlannerText(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max);
}

export function defaultPlannerEndsAt(startsAtIso: string): string {
  const ms = Date.parse(startsAtIso);
  if (!Number.isFinite(ms)) return startsAtIso;
  return new Date(ms + PLANNER_DEFAULT_DURATION_MS).toISOString();
}

function nextCivilYmd(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const next = new Date(Date.UTC(y, mo - 1, d + 1));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Inclusive start / exclusive end of the Copenhagen civil day as UTC ISO. */
export function plannerDayWindow(ref = new Date()): {
  ymd: string;
  startIso: string;
  endIso: string;
} {
  const ymd = copenhagenYmd(ref);
  return {
    ymd,
    startIso: copenhagenStartOfDateUtcIso(ymd),
    endIso: copenhagenStartOfDateUtcIso(nextCivilYmd(ymd)),
  };
}

export function buildPlannerInsertRow(args: {
  orgId: string;
  title: string;
  type: PlannerAppointmentType;
  scheduledAt: Date;
  residentUserId: string | null;
  location: string;
  responsible: string;
  house: PlannerHouse | '';
}): PlannerEntryInsertRow | null {
  const title = clipPlannerText(args.title, PLANNER_TITLE_MAX);
  const responsible = clipPlannerText(args.responsible, PLANNER_RESPONSIBLE_MAX);
  if (!title || !responsible) return null;
  if (!isValidUuid(args.orgId)) return null;
  const residentUserId =
    args.residentUserId && isValidUuid(args.residentUserId) ? args.residentUserId.trim() : null;
  const startsAt = args.scheduledAt.toISOString();
  return {
    org_id: args.orgId,
    title,
    category: args.type,
    starts_at: startsAt,
    ends_at: defaultPlannerEndsAt(startsAt),
    // Staff dashboard appointments stay staff-only so intern meetings are not broadcast in Lys.
    visible_to_resident: false,
    resident_user_id: residentUserId,
    location: clipPlannerText(args.location, PLANNER_LOCATION_MAX) || '—',
    responsible,
    house: args.house && isPlannerHouse(args.house) ? args.house : '',
  };
}

/** Drop extra columns when the forward migration has not been applied yet. */
export function plannerInsertWithoutExtendedColumns(
  row: PlannerEntryInsertRow
): Omit<PlannerEntryInsertRow, 'location' | 'responsible' | 'house'> {
  const { location: _location, responsible: _responsible, house: _house, ...base } = row;
  return base;
}

export function plannerInsertNeedsColumnFallback(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('does not exist') &&
    (m.includes('location') ||
      m.includes('responsible') ||
      m.includes('house') ||
      m.includes('column'))
  );
}

export function parsePlannerEntry(row: Record<string, unknown>): ParsedPlannerEntry | null {
  const id = typeof row.id === 'string' ? row.id : null;
  const title = typeof row.title === 'string' ? row.title.trim() : '';
  const startsAtIso = typeof row.starts_at === 'string' ? row.starts_at : '';
  if (!id || !title || !startsAtIso) return null;
  const type = isPlannerAppointmentType(row.category) ? row.category : 'andet';
  const residentRaw = row.resident_user_id;
  const residentUserId =
    typeof residentRaw === 'string' && isValidUuid(residentRaw) ? residentRaw.trim() : null;
  const location =
    typeof row.location === 'string' && row.location.trim() ? row.location.trim() : '—';
  const responsible =
    typeof row.responsible === 'string' && row.responsible.trim() ? row.responsible.trim() : '—';
  const house = isPlannerHouse(row.house) ? row.house : null;
  return {
    id,
    title,
    type,
    startsAtIso,
    residentUserId,
    location,
    responsible,
    house,
  };
}

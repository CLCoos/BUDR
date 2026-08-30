import { journalQueryMissingColumn } from '@/lib/journalEntriesQueryCompat';
import { isValidUuid } from '@/lib/uuid';

export const PLAN_ITEM_CATEGORIES = ['mad', 'medicin', 'aktivitet', 'hvile', 'social'] as const;
export type PlanItemCategory = (typeof PLAN_ITEM_CATEGORIES)[number];

export const PLAN_ITEM_RECURRENCE = ['none', 'daily', 'weekly', 'biweekly', 'custom'] as const;
export type PlanItemRecurrence = (typeof PLAN_ITEM_RECURRENCE)[number];

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export type ResidentPlanItemRow = {
  id: string;
  resident_id: string;
  title: string;
  category: string;
  emoji: string | null;
  time_of_day: string;
  recurrence: string;
  recurrence_days: number[] | null;
  recurrence_week_parity: string | null;
  notify: boolean;
  notify_minutes_before: number;
  created_by: string;
  staff_suggestion: boolean;
  approved_by_resident: boolean;
  active_from: string;
  active_until: string | null;
  created_at: string;
};

export type DailyPlanJsonItem = {
  id?: string;
  time: string;
  title: string;
  description?: string;
  category?: string;
};

export type LysPlanBundle = {
  items: ResidentPlanItemRow[];
  completions: string[];
  dailyPlanItems: DailyPlanJsonItem[];
};

export type CreatePlanItemInput = {
  title: string;
  time: string;
  category: PlanItemCategory;
  recurrence: PlanItemRecurrence;
  recurrence_days: number[];
  notify: boolean;
  notify_minutes_before: number;
  active_from: string;
  emoji?: string;
};

export type PlanItemPatch =
  | { action: 'approve'; id: string }
  | { action: 'reject'; id: string }
  | { action: 'complete'; id: string; date: string }
  | { action: 'uncomplete'; id: string; date: string };

export function isPlanYmd(value: string | null | undefined): value is string {
  return typeof value === 'string' && YMD_RE.test(value);
}

export function parsePlanDateParam(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return isPlanYmd(trimmed) ? trimmed : null;
}

export function normalizePlanTime(value: string): string | null {
  const trimmed = value.trim();
  const match = TIME_RE.exec(trimmed);
  if (!match) return null;
  const hh = match[1];
  const mm = match[2];
  return `${hh}:${mm}`;
}

export function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Whether a recurring resident_plan_items row is active on `date`. */
export function isPlanItemActiveOnDate(
  item: {
    recurrence: string;
    recurrence_days: number[] | null;
    recurrence_week_parity: string | null;
    active_from: string;
    active_until: string | null;
  },
  date: Date
): boolean {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const activeFrom = String(item.active_from).slice(0, 10);
  const activeUntil = item.active_until ? String(item.active_until).slice(0, 10) : null;
  if (activeFrom > dateStr) return false;
  if (activeUntil && activeUntil < dateStr) return false;
  if (item.recurrence === 'none') return activeFrom === dateStr;
  if (item.recurrence === 'daily') return true;
  const dow = date.getDay() === 0 ? 6 : date.getDay() - 1;
  const days = item.recurrence_days ?? [];
  if (!days.includes(dow)) return false;
  if (item.recurrence === 'weekly' || item.recurrence === 'custom') return true;
  const parity = item.recurrence_week_parity ?? 'all';
  if (parity === 'all') return true;
  const week = isoWeekNumber(date);
  if (parity === 'odd') return week % 2 === 1;
  return week % 2 === 0;
}

export function shouldRetryDailyPlansWithDateColumn(message: string | undefined): boolean {
  return journalQueryMissingColumn(message, 'plan_date');
}

export function parseCreatePlanItemBody(body: unknown): CreatePlanItemInput | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Ugyldig JSON' };
  const rec = body as Record<string, unknown>;
  const title = typeof rec.title === 'string' ? rec.title.trim() : '';
  if (!title) return { error: 'Titel er påkrævet' };
  if (title.length > 200) return { error: 'Titel er for lang' };

  const time = typeof rec.time === 'string' ? normalizePlanTime(rec.time) : null;
  if (!time) return { error: 'Ugyldigt tidspunkt' };

  const category =
    typeof rec.category === 'string' &&
    (PLAN_ITEM_CATEGORIES as readonly string[]).includes(rec.category)
      ? (rec.category as PlanItemCategory)
      : null;
  if (!category) return { error: 'Ugyldig kategori' };

  const recurrence =
    typeof rec.recurrence === 'string' &&
    (PLAN_ITEM_RECURRENCE as readonly string[]).includes(rec.recurrence)
      ? (rec.recurrence as PlanItemRecurrence)
      : 'none';

  const recurrenceDaysRaw = Array.isArray(rec.recurrence_days)
    ? rec.recurrence_days.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6)
    : recurrence === 'daily'
      ? [0, 1, 2, 3, 4, 5, 6]
      : [];

  const notify = rec.notify === true;
  const notifyMinutes =
    typeof rec.notify_minutes_before === 'number' && Number.isFinite(rec.notify_minutes_before)
      ? Math.min(180, Math.max(0, Math.round(rec.notify_minutes_before)))
      : 10;

  const activeFrom =
    typeof rec.active_from === 'string' && isPlanYmd(rec.active_from.trim())
      ? rec.active_from.trim()
      : null;
  if (!activeFrom) return { error: 'Ugyldig dato' };

  const emoji = typeof rec.emoji === 'string' ? rec.emoji.trim().slice(0, 8) : undefined;

  return {
    title,
    time,
    category,
    recurrence,
    recurrence_days: recurrenceDaysRaw,
    notify,
    notify_minutes_before: notifyMinutes,
    active_from: activeFrom,
    emoji: emoji || undefined,
  };
}

export function parsePlanItemPatch(body: unknown): PlanItemPatch | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Ugyldig JSON' };
  const rec = body as Record<string, unknown>;
  const action = rec.action;
  const id = typeof rec.id === 'string' ? rec.id.trim() : '';
  if (!id) return { error: 'Mangler id' };

  if (action === 'approve' || action === 'reject') {
    if (!isValidUuid(id)) return { error: 'Ugyldigt id' };
    return { action, id };
  }
  if (action === 'complete' || action === 'uncomplete') {
    const date = typeof rec.date === 'string' ? rec.date.trim() : '';
    if (!isPlanYmd(date)) return { error: 'Ugyldig dato' };
    return { action, id, date };
  }
  return { error: 'Ugyldig handling' };
}

export function canPersistPlanCompletion(planItemId: string): boolean {
  return isValidUuid(planItemId);
}

const CATEGORY_EMOJI: Record<string, string> = {
  mad: '🍽',
  medicin: '💊',
  aktivitet: '⚡',
  hvile: '😌',
  social: '👥',
};

export function defaultEmojiForCategory(category: string): string {
  return CATEGORY_EMOJI[category] ?? '📌';
}

export async function fetchLysPlanBundle(date: string): Promise<LysPlanBundle> {
  const empty: LysPlanBundle = { items: [], completions: [], dailyPlanItems: [] };
  try {
    const res = await fetch(`/api/lys/plan-items?date=${encodeURIComponent(date)}`, {
      credentials: 'include',
    });
    if (!res.ok) return empty;
    const data = (await res.json()) as Partial<LysPlanBundle>;
    return {
      items: Array.isArray(data.items) ? data.items : [],
      completions: Array.isArray(data.completions) ? data.completions : [],
      dailyPlanItems: Array.isArray(data.dailyPlanItems) ? data.dailyPlanItems : [],
    };
  } catch {
    return empty;
  }
}

export async function createLysPlanItem(input: CreatePlanItemInput): Promise<boolean> {
  try {
    const res = await fetch('/api/lys/plan-items', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function patchLysPlanItem(patch: PlanItemPatch): Promise<boolean> {
  try {
    const res = await fetch('/api/lys/plan-items', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}

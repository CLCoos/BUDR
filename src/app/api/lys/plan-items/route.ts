import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import { isResidentUuidForCloud } from '@/lib/residentUuid';
import { copenhagenYmd } from '@/lib/copenhagenDay';
import {
  canPersistPlanCompletion,
  defaultEmojiForCategory,
  parseCreatePlanItemBody,
  parsePlanDateParam,
  parsePlanItemPatch,
  shouldRetryDailyPlansWithDateColumn,
  type DailyPlanJsonItem,
  type ResidentPlanItemRow,
} from '@/lib/lys/planItems';

const PLAN_ITEM_COLUMNS =
  'id, resident_id, title, category, emoji, time_of_day, recurrence, recurrence_days, recurrence_week_parity, notify, notify_minutes_before, created_by, staff_suggestion, approved_by_resident, active_from, active_until, created_at';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function emptyBundle() {
  return {
    items: [] as ResidentPlanItemRow[],
    completions: [] as string[],
    dailyPlanItems: [] as DailyPlanJsonItem[],
  };
}

async function requireCloudResident(): Promise<
  | {
      ok: true;
      residentId: string;
      orgId: string | null;
      supabase: NonNullable<ReturnType<typeof getServiceClient>>;
    }
  | { ok: false; response: NextResponse }
> {
  const residentId = await getResidentId();
  if (!residentId) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!isResidentUuidForCloud(residentId)) {
    return {
      ok: false,
      response: NextResponse.json({ ...emptyBundle(), ok: true, demo: true }),
    };
  }
  const supabase = getServiceClient();
  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Database unavailable' }, { status: 503 }),
    };
  }
  const { data: resident, error } = await supabase
    .from('care_residents')
    .select('user_id, org_id')
    .eq('user_id', residentId)
    .maybeSingle();
  if (error) {
    return { ok: false, response: NextResponse.json({ error: error.message }, { status: 500 }) };
  }
  if (!resident) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return {
    ok: true,
    residentId,
    orgId: (resident as { org_id?: string | null }).org_id ?? null,
    supabase,
  };
}

async function fetchDailyPlanItems(
  supabase: NonNullable<ReturnType<typeof getServiceClient>>,
  residentId: string,
  date: string
): Promise<DailyPlanJsonItem[]> {
  const withPlanDate = await supabase
    .from('daily_plans')
    .select('plan_items')
    .eq('resident_id', residentId)
    .eq('plan_date', date)
    .maybeSingle();

  let data = withPlanDate.data;
  if (withPlanDate.error && shouldRetryDailyPlansWithDateColumn(withPlanDate.error.message)) {
    const withDate = await supabase
      .from('daily_plans')
      .select('plan_items')
      .eq('resident_id', residentId)
      .eq('date', date)
      .maybeSingle();
    if (withDate.error) return [];
    data = withDate.data;
  } else if (withPlanDate.error) {
    return [];
  }

  const raw = (data as { plan_items?: unknown } | null)?.plan_items;
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is DailyPlanJsonItem => {
    if (!row || typeof row !== 'object') return false;
    const item = row as DailyPlanJsonItem;
    return typeof item.time === 'string' && typeof item.title === 'string';
  });
}

/**
 * GET /api/lys/plan-items?date=YYYY-MM-DD
 * Cookie + service role. Browser RLS requires auth.uid() = resident_id, which
 * cookie-session Lys residents do not have.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireCloudResident();
  if (!auth.ok) return auth.response;

  const date = parsePlanDateParam(req.nextUrl.searchParams.get('date')) ?? copenhagenYmd();
  const { residentId, supabase } = auth;

  const [itemsRes, completionsRes, dailyPlanItems] = await Promise.all([
    supabase
      .from('resident_plan_items')
      .select(PLAN_ITEM_COLUMNS)
      .eq('resident_id', residentId)
      .order('time_of_day'),
    supabase
      .from('resident_plan_completions')
      .select('plan_item_id')
      .eq('resident_id', residentId)
      .eq('completion_date', date),
    fetchDailyPlanItems(supabase, residentId, date),
  ]);

  if (itemsRes.error) {
    return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
  }

  const completions = (completionsRes.data ?? [])
    .map((row) => (row as { plan_item_id?: string | null }).plan_item_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  return NextResponse.json({
    items: (itemsRes.data ?? []) as ResidentPlanItemRow[],
    completions,
    dailyPlanItems,
  });
}

/**
 * POST /api/lys/plan-items — create a resident-owned plan item.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireCloudResident();
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }
  const parsed = parseCreatePlanItemBody(raw);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 422 });
  }

  const { residentId, orgId, supabase } = auth;
  const { error } = await supabase.from('resident_plan_items').insert({
    resident_id: residentId,
    title: parsed.title,
    category: parsed.category,
    emoji: parsed.emoji ?? defaultEmojiForCategory(parsed.category),
    time_of_day: parsed.time,
    recurrence: parsed.recurrence,
    recurrence_days: parsed.recurrence_days,
    notify: parsed.notify,
    notify_minutes_before: parsed.notify_minutes_before,
    created_by: 'resident',
    staff_suggestion: false,
    approved_by_resident: true,
    active_from: parsed.active_from,
    org_id: orgId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/lys/plan-items — approve/reject staff suggestion or complete/uncomplete.
 */
export async function PATCH(req: Request): Promise<NextResponse> {
  const auth = await requireCloudResident();
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }
  const parsed = parsePlanItemPatch(raw);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 422 });
  }

  const { residentId, supabase } = auth;

  if (parsed.action === 'approve') {
    const { data, error } = await supabase
      .from('resident_plan_items')
      .update({ approved_by_resident: true })
      .eq('id', parsed.id)
      .eq('resident_id', residentId)
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (parsed.action === 'reject') {
    const { data: existing, error: fetchErr } = await supabase
      .from('resident_plan_items')
      .select('id, staff_suggestion, created_by')
      .eq('id', parsed.id)
      .eq('resident_id', residentId)
      .maybeSingle();
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const row = existing as { staff_suggestion?: boolean; created_by?: string };
    if (!row.staff_suggestion && row.created_by !== 'resident') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { error } = await supabase
      .from('resident_plan_items')
      .delete()
      .eq('id', parsed.id)
      .eq('resident_id', residentId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!canPersistPlanCompletion(parsed.id)) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const { data: owned, error: ownedErr } = await supabase
    .from('resident_plan_items')
    .select('id')
    .eq('id', parsed.id)
    .eq('resident_id', residentId)
    .maybeSingle();
  if (ownedErr) return NextResponse.json({ error: ownedErr.message }, { status: 500 });
  if (!owned) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  if (parsed.action === 'complete') {
    const { error } = await supabase.from('resident_plan_completions').upsert(
      {
        resident_id: residentId,
        plan_item_id: parsed.id,
        completion_date: parsed.date,
      },
      { onConflict: 'resident_id,plan_item_id,completion_date' }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, persisted: true });
  }

  const { error } = await supabase
    .from('resident_plan_completions')
    .delete()
    .eq('resident_id', residentId)
    .eq('plan_item_id', parsed.id)
    .eq('completion_date', parsed.date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, persisted: true });
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';

const ALLOWED_ACTIVITIES = new Set([
  'hum_check',
  'journal',
  'lys_chat',
  'plan_completion',
  'haven_water',
]);

const MAX_XP_PER_CALL = 50;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * POST /api/lys/award-xp
 * Body: { activity: string, xp: number }
 *
 * Awards XP for the cookie-bound resident only. The public `award_xp` RPC is
 * revoked from anon/authenticated — clients must not call it directly.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { activity?: unknown; xp?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const activity = typeof body.activity === 'string' ? body.activity.trim() : '';
  const xpRaw = typeof body.xp === 'number' ? body.xp : Number.NaN;
  if (!ALLOWED_ACTIVITIES.has(activity)) {
    return NextResponse.json({ error: 'Ugyldig activity' }, { status: 400 });
  }
  if (!Number.isFinite(xpRaw) || xpRaw <= 0) {
    return NextResponse.json({ error: 'Ugyldigt xp' }, { status: 400 });
  }
  const xp = Math.min(MAX_XP_PER_CALL, Math.floor(xpRaw));

  if (!isUuid(residentId)) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { data, error } = await supabase.rpc('award_xp', {
    p_resident_id: residentId,
    p_activity: activity,
    p_xp: xp,
  });

  if (error) {
    console.error('[award-xp]', error.message);
    return NextResponse.json({ error: 'Kunne ikke tildele XP' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, total_xp: data ?? null });
}

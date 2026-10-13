import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import { isResidentUuidForCloud } from '@/lib/residentUuid';
import { isLysXpActivity, LYS_XP_BY_ACTIVITY } from '@/lib/lys/xp';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Tildeler XP til den indloggede borger. award_xp() kan ikke længere kaldes fra
 * browseren (før kunne enhver give vilkårlig XP til vilkårlige borgere).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { activity?: unknown };
  try {
    body = (await req.json()) as { activity?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!isLysXpActivity(body.activity)) {
    return NextResponse.json({ error: 'invalid_activity' }, { status: 400 });
  }
  if (!isResidentUuidForCloud(residentId)) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { data, error } = await supabase.rpc('award_xp', {
    p_resident_id: residentId,
    p_activity: body.activity,
    p_xp: LYS_XP_BY_ACTIVITY[body.activity],
  });
  if (error) {
    console.error('[lys/xp POST]', error.message);
    return NextResponse.json({ error: 'xp_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, total: data });
}

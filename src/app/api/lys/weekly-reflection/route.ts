import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import type { LysWeeklyReflection, LysWeeklyReflectionInput } from '@/types/lys';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function validateScore(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number') return null;
  if (!Number.isInteger(v)) return null;
  if (v < 1 || v > 10) return null;
  return v;
}

export async function GET() {
  const residentId = await getResidentId();
  if (!residentId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'server_not_configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('lys_checkin')
    .select('*')
    .eq('resident_id', residentId)
    .eq('checkin_type', 'weekly')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reflection: data as LysWeeklyReflection | null });
}

export async function POST(req: NextRequest) {
  const residentId = await getResidentId();
  if (!residentId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'server_not_configured' }, { status: 503 });
  }

  let body: Partial<LysWeeklyReflectionInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const connectedness = validateScore(body.connectedness_score);
  const hope = validateScore(body.hope_score);
  const identity = validateScore(body.identity_score);
  const meaning = validateScore(body.meaning_score);
  const empowerment = validateScore(body.empowerment_score);
  const freeText =
    typeof body.free_text === 'string' ? body.free_text.trim().slice(0, 2000) || null : null;

  const hasAnyData =
    connectedness !== null ||
    hope !== null ||
    identity !== null ||
    meaning !== null ||
    empowerment !== null ||
    freeText !== null;
  if (!hasAnyData) {
    return NextResponse.json({ error: 'empty_reflection' }, { status: 400 });
  }

  const { data: resident, error: residentErr } = await supabase
    .from('care_residents')
    .select('org_id')
    .eq('user_id', residentId)
    .maybeSingle();

  if (residentErr) {
    return NextResponse.json({ error: residentErr.message }, { status: 500 });
  }
  if (!resident) {
    return NextResponse.json({ error: 'resident_not_found' }, { status: 404 });
  }

  const orgId = (resident as { org_id?: string | null }).org_id ?? null;

  const { data, error } = await supabase
    .from('lys_checkin')
    .insert({
      resident_id: residentId,
      org_id: orgId,
      checkin_type: 'weekly',
      connectedness_score: connectedness,
      hope_score: hope,
      identity_score: identity,
      meaning_score: meaning,
      empowerment_score: empowerment,
      free_text: freeText,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reflection: data as LysWeeklyReflection });
}

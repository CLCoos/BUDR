import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST() {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('care_residents')
    .update({ lys_voice_intro_played_at: nowIso })
    .eq('user_id', residentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

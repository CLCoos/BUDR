import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertResidentVoiceApiCaller } from '@/lib/voice/voiceApiAuth';
import { isKnownElevenLabsVoiceId } from '@/lib/voice/voices';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const auth = await assertResidentVoiceApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: { lys_voice_id?: unknown; lys_voice_autoplay?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const voiceId = typeof body.lys_voice_id === 'string' ? body.lys_voice_id.trim() : '';
  if (!voiceId || !isKnownElevenLabsVoiceId(voiceId)) {
    return NextResponse.json({ error: 'Ugyldigt stemme-id' }, { status: 400 });
  }

  const autoplay =
    typeof body.lys_voice_autoplay === 'boolean'
      ? body.lys_voice_autoplay
      : body.lys_voice_autoplay === true;

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { error } = await supabase
    .from('care_residents')
    .update({
      lys_voice_id: voiceId,
      lys_voice_autoplay: autoplay,
    })
    .eq('user_id', auth.residentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

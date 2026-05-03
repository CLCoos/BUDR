import { NextRequest, NextResponse } from 'next/server';
import { assertVoiceApiCaller } from '@/lib/voice/voiceApiAuth';
import { isElevenLabsModelOrPlanError } from '@/lib/voice/elevenLabsTtsErrors';
import { ELEVENLABS_TTS_MODEL_ID } from '@/lib/voice/elevenLabsTtsModel';
import { isKnownElevenLabsVoiceId } from '@/lib/voice/voices';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';
const OUTPUT_FORMAT = 'mp3_44100_128';

export async function POST(req: NextRequest) {
  const auth = await assertVoiceApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    console.error('[voice/tts] ELEVENLABS_API_KEY mangler');
    return NextResponse.json({ error: 'TTS ikke konfigureret' }, { status: 503 });
  }

  let body: { text?: unknown; voiceId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const voiceId = typeof body.voiceId === 'string' ? body.voiceId.trim() : '';

  if (!text || !voiceId) {
    return NextResponse.json({ error: 'Mangler text eller voiceId' }, { status: 400 });
  }

  if (!isKnownElevenLabsVoiceId(voiceId)) {
    return NextResponse.json({ error: 'Ukendt stemme-id' }, { status: 400 });
  }

  if (text.length > 1000) {
    return NextResponse.json({ error: 'Tekst max 1000 tegn' }, { status: 400 });
  }

  const ttsUrl = new URL(`${ELEVEN_BASE}/text-to-speech/${encodeURIComponent(voiceId)}`);
  ttsUrl.searchParams.set('output_format', OUTPUT_FORMAT);

  try {
    const upstream = await fetch(ttsUrl.toString(), {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_TTS_MODEL_ID,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      console.error('[voice/tts] ElevenLabs', upstream.status, errText.slice(0, 500));
      if (isElevenLabsModelOrPlanError(upstream.status, errText)) {
        console.error(
          '[voice/tts] Model/plan:',
          ELEVENLABS_TTS_MODEL_ID,
          '— tjek ElevenLabs-abonnement og model-tilgængelighed'
        );
        return NextResponse.json(
          { error: 'Voice model not available on current plan' },
          { status: 503 }
        );
      }
      const errPayload: { error: string; detail?: string } = { error: 'TTS fejlede' };
      if (process.env.NODE_ENV !== 'production' && errText.trim()) {
        errPayload.detail = errText.trim().slice(0, 500);
      }
      return NextResponse.json(errPayload, { status: 502 });
    }

    const audioBuffer = Buffer.from(await upstream.arrayBuffer());

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[voice/tts]', e);
    return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
  }
}

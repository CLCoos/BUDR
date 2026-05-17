import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { assertVoiceApiCaller } from '@/lib/voice/voiceApiAuth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await assertVoiceApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error('[voice/stt] OPENAI_API_KEY mangler');
    return NextResponse.json({ error: 'STT ikke konfigureret' }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Ugyldig form-data' }, { status: 400 });
  }

  const file = formData.get('audio');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Mangler audio-fil' }, { status: 400 });
  }

  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fil for stor (max 25 MB)' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'da',
    });

    const text =
      typeof transcription === 'string'
        ? transcription
        : 'text' in transcription && typeof transcription.text === 'string'
          ? transcription.text
          : '';

    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    console.error('[voice/stt]', e);
    return NextResponse.json({ error: 'STT transcription failed' }, { status: 500 });
  }
}

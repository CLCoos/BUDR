import { NextRequest, NextResponse } from 'next/server';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SYSTEM = `Du er en professionel pædagog på et socialpsykiatrisk bosted. Din opgave er at omskrive følgende rånotat til en professionel, klar og empatisk journalnotat. Bevar alle faktuelle oplysninger. Fjern talesprog og gentagelser. Brug fagligt dansk. Max 150 ord.`;

/**
 * POST /api/journal-polish
 * Body: { text: string }
 * Kræver indlogget portal-bruger + ANTHROPIC_API_KEY.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY er ikke sat på serveren' },
      { status: 503 }
    );
  }

  let body: { text?: string; draft?: string };
  try {
    body = (await req.json()) as { text?: string; draft?: string };
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const rawInput =
    (typeof body.text === 'string' ? body.text : '') ||
    (typeof body.draft === 'string' ? body.draft : '');
  const text = rawInput.trim();
  if (!text) {
    return NextResponse.json({ error: 'Manglende tekst' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_CHAT_MODEL,
        max_tokens: 300,
        system: SYSTEM,
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Anthropic error', res.status, errText);
      return NextResponse.json({ error: 'AI-kald fejlede. Prøv igen senere.' }, { status: 502 });
    }

    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const block = data.content?.find((c) => c.type === 'text');
    const polished = block?.text?.trim();
    if (!polished) {
      return NextResponse.json({ error: 'Tomt svar fra AI' }, { status: 502 });
    }

    return NextResponse.json({ polished, text: polished });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Netværksfejl' }, { status: 502 });
  }
}

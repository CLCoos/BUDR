import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Du er en varm og empatisk støtte til mennesker i socialpsykiatri.
Din opgave er at opsummere en borgers dagbogsindtastning i 1-2 sætninger på dansk.

Regler:
- Fokusér på ressourcer, styrker og positive elementer frem for problemer
- Vær aldrig klinisk, distanceret eller psykologfaglig i sproget
- Skriv i anden person: "Du fortæller at..."
- Hvis borgeren nævner noget svært, anerkend det kort men afslut positivt
- Maks 40 ord i opsummeringen
- Aldrig diagnostisk sprog, aldrig ord som "symptomer", "episode", "tilstand"`;

type Body = { transcript?: unknown };

export async function POST(req: Request): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
  if (!transcript) {
    return NextResponse.json({ error: 'Mangler transcript' }, { status: 422 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'AI svarer ikke lige nu' }, { status: 502 });
  }

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const summary = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
  if (!summary) {
    return NextResponse.json({ error: 'Tomt AI-svar' }, { status: 502 });
  }

  return NextResponse.json({ summary });
}

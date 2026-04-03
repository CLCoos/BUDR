import { NextRequest, NextResponse } from 'next/server';

const LYS_SYSTEM = `Du er Lys — en varm, empatisk AI-følgesvend til beboere på et socialpsykiatrisk bosted i Danmark. Du taler direkte til beboeren ved fornavn. Du er aldrig klinisk, aldrig distanceret. Du er nysgerrig, anerkendende og rolig. Du stiller aldrig mere end ét spørgsmål ad gangen. Du bruger enkle ord og korte sætninger. Du husker hvad beboeren har fortalt dig i denne session og refererer til det naturligt. Du er ikke en terapeut — du er en ven der lytter og afspejler. Max 2-3 sætninger per svar.`;

export type LysChatMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'Lys er ikke konfigureret endnu', fallback: true },
      { status: 503 }
    );
  }

  let body: {
    messages?: LysChatMessage[];
    residentFirstName?: string;
    timeOfDay?: string;
    mood?: string | null;
    sessionContext?: string;
    mode?: 'chat' | 'counter_thought';
    thoughtSteps?: { situation?: string; thought?: string; feeling?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const firstName = body.residentFirstName?.trim() || 'ven';
  const timeOfDay = body.timeOfDay ?? 'dag';
  const mood = body.mood ? `Beboeren har delt humør: ${body.mood}.` : '';
  const ctx = body.sessionContext?.trim() ?? '';
  const mode = body.mode ?? 'chat';

  let system = `${LYS_SYSTEM}

Kontekst lige nu:
- Beboerens fornavn: ${firstName}
- Tid på dagen: ${timeOfDay}
${mood ? `- ${mood}` : ''}
${ctx ? `\nTidligere små glimt fra samtaler:\n${ctx}` : ''}`;

  const msgs: LysChatMessage[] = Array.isArray(body.messages) ? body.messages : [];

  if (mode === 'counter_thought') {
    const s = body.thoughtSteps?.situation ?? '';
    const t = body.thoughtSteps?.thought ?? '';
    const f = body.thoughtSteps?.feeling ?? '';
    system = `Du er Lys. Beboeren hedder ${firstName}. Ud fra CBT-inspireret støtte: giv ÉN kort, mild modtanke (én til to sætninger) som udfordrer den automatiske tanke — uden at være belærende. Brug "du" og enkle ord.

Situation (beboerens ord): ${s}
Tanke: ${t}
Følelse: ${f}`;
    const userContent =
      msgs.length > 0
        ? msgs[msgs.length - 1]!.content
        : 'Giv en modtanke og afslut med ét kort spørgsmål.';
    try {
      const text = await callAnthropic(key, system, [{ role: 'user', content: userContent }]);
      return NextResponse.json({ text });
    } catch {
      return NextResponse.json({
        text: `Hvad hvis man også kunne se det sådan her: du gør dit bedste, og det er nok lige nu. Hvordan føles det at høre?`,
        fallback: true,
      });
    }
  }

  const anthropicMessages = msgs.map((m) => ({
    role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
    content: m.content,
  }));

  if (anthropicMessages.length === 0) {
    return NextResponse.json({ error: 'Ingen beskeder' }, { status: 400 });
  }

  try {
    const text = await callAnthropic(key, system, anthropicMessages);
    return NextResponse.json({ text });
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      text: `Hej ${firstName}. Jeg er her med dig. Vil du fortælle mig lidt mere — i dit eget tempo?`,
      fallback: true,
    });
  }
}

async function callAnthropic(
  key: string,
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('lys-chat anthropic', res.status, err);
    throw new Error('anthropic');
  }

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const block = data.content?.find((c) => c.type === 'text');
  const t = block?.text?.trim();
  if (!t) throw new Error('empty');
  return t;
}

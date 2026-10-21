import { NextRequest, NextResponse } from 'next/server';
import { getResidentId } from '@/lib/residentAuth';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { claudeApiKey } from '@/lib/ai/claudeTransport';
import { clipText } from '@/lib/ai/aliases';
import { checkApiRateLimit, getClientIp } from '@/lib/apiRateLimit';

const SYSTEM = `Du er Lys, en rolig og varm ledsager i en dansk app til mennesker, der bor på et socialpsykiatrisk botilbud. Borgeren har lige skrevet i sin dagbog.

Skriv én kort, oprigtig kommentar til det, borgeren skrev: højst 2 sætninger og 35 ord.
- Spejl borgerens egne ord. Anerkend uden at overdrive, og uden at love noget.
- Ser du et godt mønster i de seneste indlæg, må du nævne det stille.
- Ingen råd om medicin, ingen diagnoser, ingen spørgsmål der kræver svar.
- Skriver borgeren om at ville skade sig selv eller ikke at ville leve, så sig roligt, at det er vigtigt at tale med personalet nu, og at de kan ringe til Livslinien på 70 201 201.
- Ingen emojis.`;

export async function POST(req: NextRequest) {
  const residentId = await getResidentId();
  if (!residentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = checkApiRateLimit(
    'lys-journal-reply',
    `${residentId}:${getClientIp(req)}`,
    20,
    60_000
  );
  if (!rl.ok) return NextResponse.json({ error: 'For mange forsøg' }, { status: 429 });

  let body: { content?: unknown; mood?: unknown; phase?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const content = clipText(body.content, 600);
  if (!content) return NextResponse.json({ error: 'Tomt indlæg' }, { status: 400 });

  const key = claudeApiKey();
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  const history = Array.isArray(body.history)
    ? body.history
        .slice(0, 3)
        .map((h) => clipText(h, 120))
        .filter(Boolean)
    : [];
  const userMessage = `Stemning: ${clipText(body.mood, 30) || 'ikke valgt'}. Tidspunkt: ${clipText(body.phase, 30) || 'ukendt'}.${
    history.length ? `\n\nSeneste indlæg:\n${history.join('\n')}` : ''
  }\n\nDagens indlæg: "${content}"`;

  const result = await callAnthropicJournalPolish({
    apiKey: key,
    system: SYSTEM,
    userMessage,
    maxTokens: 150,
    temperature: 0.6,
  });
  if (!result.ok) return NextResponse.json({ error: 'AI svarer ikke' }, { status: 502 });
  return NextResponse.json({ text: result.text });
}

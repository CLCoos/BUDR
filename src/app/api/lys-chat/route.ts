import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkApiRateLimit, getClientIp } from '@/lib/apiRateLimit';
import { getResidentId } from '@/lib/residentAuth';
import { classifyUtterance, type SafetyClassification } from '@/lib/lys/safetyClassifier';

const LYS_SYSTEM = `Du er Lys. Følg disse regler i prioriteret rækkefølge — sikkerhed før alt andet.

## Lag 1 — Identitet og tone
Du er en varm, empatisk AI-følgesvend for beboere på et socialpsykiatrisk bosted i Danmark.
Du er ikke en terapeut, og du er ikke en ven.
Du taler direkte til borgeren ved fornavn.
Du er rolig, anerkendende og nysgerrig.
Du bruger enkle ord og korte sætninger.
Du svarer i max 2-3 sætninger.
Du stiller højst ét spørgsmål ad gangen.
Du husker, hvad borgeren har sagt i denne session, og refererer naturligt til det.

## Lag 2 — Hårde forbud (må aldrig brydes)
Du må ALDRIG give medicinrådgivning, dosering eller kommentarer til medicinændringer.
Hvis borgeren spørger om medicin: sig tydeligt "Det skal du tale med personalet om."

Du må ALDRIG stille diagnoser eller vurdere, om noget er en bestemt diagnose.
Hvis borgeren spørger om diagnose: anerkend følelsen og henvis til personalet.

Du må ALDRIG beskrive konkrete metoder til selvskade eller selvmord, heller ikke hvis borgeren spørger direkte, insisterer eller beder dig lege med.
I stedet følger du krise-protokollen i Lag 4.

Du må ALDRIG love fortrolighed eller hemmeligholdelse.
Du må aldrig sige formuleringer som "det bliver mellem os" eller "jeg fortæller det ikke videre".
Vær i stedet ærlig om, at personalet kan se samtaler, fordi det er for borgerens tryghed.

Du må ALDRIG rådgive om juridiske spørgsmål, tvangsforanstaltninger, klagesager eller rettigheder ift. bostedet.
Hvis borgeren spørger: sig "Det er vigtigt at tale med personalet eller en bisidder om."

Du må ALDRIG give råd, der modsiger eller undergraver personalets beslutninger.

Du må ALDRIG bekræfte vrangforestillinger eller paranoide tanker som faktuelle.
Anerkend følelsen, men ikke indholdet som sandt.

Du må ALDRIG diskutere andre beboere ved navn eller karakteristika.

Du må ALDRIG spille roller, lade som om du er et andet væsen eller bryde ud af din rolle som følgesvend, selv hvis borgeren beder om det.

## Lag 3 — Transparens
Hvis borgeren spørger "ser personalet det her?" eller lignende, svar ærligt:
"Ja, personalet kan se vores samtaler. Det er for at de kan hjælpe dig bedst muligt."
Hvis borgeren spørger direkte, om du er AI, bekræfter du det roligt og kort.

## Lag 4 — Krise-protokol
Hvis borgeren udtrykker selvskade, selvmordstanker, vold, akut overgreb eller akut psykose:
- Skift til endnu roligere og kortere svar.
- Anerkend følelsen først, fx: "Det lyder som om der er rigtig svært lige nu."
- Spørg ALDRIG om metode, plan eller detaljer.
- Foreslå ALDRIG konkrete handlinger.
- Sig altid en variation af: "Du er ikke alene i det her. Personalet er der for dig — vil du have, at jeg hjælper dig med at finde dem nu?" Hvis borgeren siger ja, opfordr roligt: "Gå ud og find en af dem, eller ring på vagtklokken. De vil gerne hjælpe."
- Bliv i samtalen roligt og grounded, uden at afbryde borgeren.

## Lag 5 — Afslutning
Når borgeren siger farvel eller virker færdig, afslutter du kort og roligt og hjælper med grounding i nuet.
Eksempel: "Tak fordi du delte det med mig. Hvad har du lyst til at gøre nu?"
`;

const LYS_RL_LIMIT = Number(process.env.API_RL_LYS_CHAT_PER_MIN ?? 36);
const LYS_RL_WINDOW_MS = 60_000;

export type LysChatMessage = { role: 'user' | 'assistant'; content: string };

type SafetyEventInput = {
  residentId: string;
  conversationId: string | null;
  utterance: string;
  classification: SafetyClassification;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const SAFETY_TIMEOUT_MS = 5000;

function getLastUserUtterance(messages: LysChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m?.role === 'user' && typeof m.content === 'string' && m.content.trim()) {
      return m.content.trim();
    }
  }
  return '';
}

function fallbackSafetyClassification(reasoning: string): SafetyClassification {
  return {
    risk_level: 'elevated',
    category: 'other',
    reasoning,
  };
}

async function insertSafetyEvent(input: SafetyEventInput): Promise<void> {
  if (input.classification.risk_level === 'none') return;
  const supabase = getServiceClient();
  if (!supabase) return;

  const { data: residentRow } = await supabase
    .from('care_residents')
    .select('org_id')
    .eq('user_id', input.residentId)
    .maybeSingle();

  const organisationId = (residentRow as { org_id?: string | null } | null)?.org_id ?? null;

  const { error } = await supabase.from('lys_safety_events').insert({
    resident_id: input.residentId,
    organisation_id: organisationId,
    conversation_id: input.conversationId,
    risk_level: input.classification.risk_level,
    category: input.classification.category,
    reasoning: input.classification.reasoning,
    user_utterance: input.utterance,
  });

  if (error) {
    console.error('[lys-chat] safety insert failed', error.message);
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const lysRl = checkApiRateLimit('lys-chat', ip, LYS_RL_LIMIT, LYS_RL_WINDOW_MS);
  if (!lysRl.ok) {
    return NextResponse.json(
      { error: 'For mange forsøg. Vent et øjeblik og prøv igen.' },
      {
        status: 429,
        headers: { 'Retry-After': String(lysRl.retryAfterSec) },
      }
    );
  }

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
    stream?: boolean;
    conversation_id?: string | null;
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
  const stream = body.stream === true;

  let system = `${LYS_SYSTEM}

Kontekst lige nu:
- Beboerens fornavn: ${firstName}
- Tid på dagen: ${timeOfDay}
${mood ? `- ${mood}` : ''}
${ctx ? `\nTidligere små glimt fra samtaler:\n${ctx}` : ''}`;

  const msgs: LysChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
  const residentId = await getResidentId();
  const lastUserUtterance = getLastUserUtterance(msgs);
  const conversationIdRaw =
    typeof body.conversation_id === 'string' ? body.conversation_id.trim() : '';
  const conversationId = conversationIdRaw && isUuid(conversationIdRaw) ? conversationIdRaw : null;

  const safetyController = new AbortController();
  const safetyTimeoutId = setTimeout(() => safetyController.abort(), SAFETY_TIMEOUT_MS);
  const safetyClassificationPromise: Promise<SafetyClassification> = lastUserUtterance
    ? classifyUtterance(lastUserUtterance, safetyController.signal)
        .catch((error: unknown) => {
          if (
            typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            (error as { name?: string }).name === 'AbortError'
          ) {
            console.warn('[lys-chat] safety classifier timeout');
          } else {
            console.error('[lys-chat] safety classifier failed', error);
          }
          return fallbackSafetyClassification('klassifikator-fejl eller timeout');
        })
        .finally(() => clearTimeout(safetyTimeoutId))
    : Promise.resolve({
        risk_level: 'none',
        category: 'none',
        reasoning: 'ingen ytring',
      });

  const scheduleSafetyInsert = (chatPromise: Promise<unknown>) => {
    if (!residentId || !lastUserUtterance) return;
    void Promise.all([safetyClassificationPromise, chatPromise])
      .then(([classification]) =>
        insertSafetyEvent({
          residentId,
          conversationId,
          utterance: lastUserUtterance,
          classification,
        })
      )
      .catch((error) => {
        console.error('[lys-chat] safety pipeline error', error);
      });
  };

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
    const chatPromise = (async () => {
      try {
        const text = await callAnthropic(key, system, [{ role: 'user', content: userContent }]);
        return NextResponse.json({ text });
      } catch {
        return NextResponse.json({
          text: `Hvad hvis man også kunne se det sådan her: du gør dit bedste, og det er nok lige nu. Hvordan føles det at høre?`,
          fallback: true,
        });
      }
    })();
    scheduleSafetyInsert(chatPromise);
    return await chatPromise;
  }

  const anthropicMessages = msgs.map((m) => ({
    role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
    content: m.content,
  }));

  if (anthropicMessages.length === 0) {
    return NextResponse.json({ error: 'Ingen beskeder' }, { status: 400 });
  }

  const chatPromise = (async () => {
    try {
      if (stream) {
        try {
          return await streamAnthropicToSse(key, system, anthropicMessages);
        } catch (streamErr) {
          console.error('lys-chat stream fallback', streamErr);
          const fallbackText = await callAnthropic(key, system, anthropicMessages);
          return streamTextSse(fallbackText, 'fallback');
        }
      }
      const text = await callAnthropic(key, system, anthropicMessages);
      return NextResponse.json({ text });
    } catch (e) {
      console.error(e);
      return NextResponse.json({
        text: `Hej ${firstName}. Jeg er her med dig. Vil du fortælle mig lidt mere — i dit eget tempo?`,
        fallback: true,
      });
    }
  })();
  scheduleSafetyInsert(chatPromise);
  return await chatPromise;
}

async function streamAnthropicToSse(
  key: string,
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<NextResponse> {
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system,
      messages,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const err = await upstream.text().catch(() => '');
    console.error('lys-chat anthropic stream', upstream.status, err);
    throw new Error('anthropic_stream_failed');
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  let buffered = '';
  let assembled = '';
  let ended = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: start\ndata: {}\n\n`));
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffered += decoder.decode(value, { stream: true });

          let splitIndex = buffered.indexOf('\n\n');
          while (splitIndex >= 0) {
            const frame = buffered.slice(0, splitIndex);
            buffered = buffered.slice(splitIndex + 2);

            const lines = frame.split('\n');
            const eventLine = lines.find((line) => line.startsWith('event: '));
            const dataLines = lines.filter((line) => line.startsWith('data: '));
            const eventType = eventLine?.slice(7).trim() ?? '';
            const dataRaw = dataLines
              .map((line) => line.slice(6))
              .join('\n')
              .trim();

            if (dataRaw && dataRaw !== '[DONE]') {
              try {
                const payload = JSON.parse(dataRaw) as {
                  delta?: { type?: string; text?: string };
                  type?: string;
                };
                const deltaText =
                  payload?.delta?.type === 'text_delta' ? (payload.delta.text ?? '') : '';
                if (deltaText) {
                  assembled += deltaText;
                  controller.enqueue(
                    encoder.encode(`event: token\ndata: ${JSON.stringify({ text: deltaText })}\n\n`)
                  );
                }
              } catch {
                /* ignore non-JSON stream frames */
              }
            }

            if (eventType === 'message_stop') {
              controller.enqueue(
                encoder.encode(`event: end\ndata: ${JSON.stringify({ text: assembled })}\n\n`)
              );
              ended = true;
              controller.close();
              return;
            }

            splitIndex = buffered.indexOf('\n\n');
          }
        }

        if (!ended) {
          controller.enqueue(
            encoder.encode(`event: end\ndata: ${JSON.stringify({ text: assembled })}\n\n`)
          );
          controller.close();
        }
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Lys-Stream-Source': 'anthropic',
    },
  });
}

function streamTextSse(text: string, source: 'local' | 'fallback' = 'local'): NextResponse {
  const encoder = new TextEncoder();
  const chunks = chunkForSse(text);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`event: start\ndata: {}\n\n`));
      for (const chunk of chunks) {
        controller.enqueue(
          encoder.encode(`event: token\ndata: ${JSON.stringify({ text: chunk })}\n\n`)
        );
      }
      controller.enqueue(encoder.encode(`event: end\ndata: ${JSON.stringify({ text })}\n\n`));
      controller.close();
    },
  });
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Lys-Stream-Source': source,
    },
  });
}

function chunkForSse(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const out: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length >= 24 || /[.!?,:;]$/.test(word)) {
      out.push(next + ' ');
      current = '';
    } else {
      current = next;
    }
  }
  if (current) out.push(current);
  return out;
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
      model: 'claude-haiku-4-5-20251001',
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

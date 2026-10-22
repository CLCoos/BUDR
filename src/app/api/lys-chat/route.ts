import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkApiRateLimit, getClientIp } from '@/lib/apiRateLimit';
import { getResidentId } from '@/lib/residentAuth';
import { classifyUtterance, type SafetyClassification } from '@/lib/lys/safetyClassifier';
import { ownedConversationIdForSafetyEvent } from '@/lib/lys/lysConversations';
import { checkResidentText } from '@/lib/lys/residentTextSafety';
import { medLysPersona } from '@/lib/lys/persona';
import { isValidUuid } from '@/lib/uuid';
import { claudeApiKey, claudeMessagesFetch } from '@/lib/ai/claudeTransport';

// Lys' faste personlighed og grænser står i persona.ts; her kun det, der gælder samtalen.
const LYS_SYSTEM = medLysPersona(`Du taler med borgeren i Lys-samtalen.
- Svar i højst 2-3 sætninger.
- Husk, hvad borgeren har sagt i denne samtale, og vend naturligt tilbage til det.
- Du arbejder recovery-orienteret og leder stille samtalen mod fem områder uden at nævne dem: forbundethed ("Hvem holder du af lige nu?"), håb ("Hvad ser du frem til?"), identitet ("Hvad er du stolt af?"), mening ("Hvad er vigtigt for dig?") og handlekraft ("Hvilken beslutning er du glad for?").
- Når borgeren fortæller om noget svært, så spørg "Hvad hjalp dig igennem det?" eller "Var der noget, der gav dig styrke?".
- Ved krise: spørg, om du skal hjælpe borgeren med at finde personalet nu. Siger borgeren ja, så sig roligt: "Gå ud og find en af dem, eller ring på vagtklokken. De vil gerne hjælpe." Bliv i samtalen og afbryd ikke borgeren.
- Spørger borgeren, om personalet kan se samtalen, så svar: "Ja, personalet kan se vores samtaler. Det er for at de kan hjælpe dig bedst muligt."
- Når borgeren siger farvel, så afslut kort og roligt, fx "Tak fordi du delte det med mig. Hvad har du lyst til at gøre nu?"`);

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

  let conversationId: string | null = null;
  if (input.conversationId) {
    const { data: convRow } = await supabase
      .from('lys_conversations')
      .select('resident_id')
      .eq('id', input.conversationId)
      .maybeSingle();
    conversationId = ownedConversationIdForSafetyEvent({
      conversationId: input.conversationId,
      eventResidentId: input.residentId,
      rowResidentId: (convRow as { resident_id?: string } | null)?.resident_id ?? null,
    });
  }

  await checkResidentText({
    supabase,
    residentId: input.residentId,
    orgId: organisationId,
    text: input.utterance,
    source: 'lys_samtale',
    conversationId,
    classify: async () => input.classification,
  });
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

  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json(
      { error: 'Du skal være logget ind i Lys for at tale med Lys.' },
      { status: 401 }
    );
  }

  const key = claudeApiKey();
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
    mode?: 'chat';
    stream?: boolean;
    conversation_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  // Navnet bruges kun i reservesvaret her på serveren; det sendes ikke til AI'en.
  const firstName = body.residentFirstName?.trim() || 'ven';
  const timeOfDay = body.timeOfDay ?? 'dag';
  const mood = body.mood ? `Beboeren har delt humør: ${body.mood}.` : '';
  const ctx = body.sessionContext?.trim() ?? '';
  const mode = body.mode ?? 'chat';
  const stream = body.stream === true;

  const system = `${LYS_SYSTEM}

Kontekst lige nu:
- Tid på dagen: ${timeOfDay}
${mood ? `- ${mood}` : ''}
${ctx ? `\nTidligere små glimt fra samtaler:\n${ctx}` : ''}`;

  const msgs: LysChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
  const lastUserUtterance = getLastUserUtterance(msgs);
  const conversationIdRaw =
    typeof body.conversation_id === 'string' ? body.conversation_id.trim() : '';
  const conversationId =
    conversationIdRaw && isValidUuid(conversationIdRaw) ? conversationIdRaw : null;

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
  const upstream = await claudeMessagesFetch(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      temperature: 0.7,
      system,
      messages,
      stream: true,
    },
    { apiKey: key }
  );

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
  const res = await claudeMessagesFetch(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      temperature: 0.7,
      system,
      messages,
    },
    { apiKey: key }
  );

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

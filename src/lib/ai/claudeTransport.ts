/**
 * Ét sted, hvor alle kald til Claude går igennem.
 *
 * - Standard: Anthropic API direkte (ANTHROPIC_API_KEY).
 * - AI_PROVIDER=bedrock: Claude via AWS Bedrock i EU (Frankfurt), så data bliver i EU.
 *   Kræver BUDR_AWS_ACCESS_KEY_ID og BUDR_AWS_SECRET_ACCESS_KEY (Netlify reserverer AWS_*-navnene).
 *
 * `claudeMessagesFetch` svarer som `fetch('https://api.anthropic.com/v1/messages', …)`: samme
 * JSON-svar, samme SSE-stream og samme fejlstatus, så eksisterende kode kun skal skifte kaldet.
 */
import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';

export type ClaudeProvider = 'anthropic' | 'bedrock';

export function claudeProvider(): ClaudeProvider {
  return process.env.AI_PROVIDER?.trim().toLowerCase() === 'bedrock' ? 'bedrock' : 'anthropic';
}

function bedrockRegion(): string {
  return process.env.BUDR_AWS_REGION?.trim() || 'eu-central-1';
}

/** Er der adgang til Claude med den valgte udbyder? */
export function claudeConfigured(): boolean {
  if (claudeProvider() === 'bedrock') {
    return Boolean(
      process.env.BUDR_AWS_ACCESS_KEY_ID?.trim() && process.env.BUDR_AWS_SECRET_ACCESS_KEY?.trim()
    );
  }
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Hvor AI-kald behandles, til visning i fx sikkerhedsoversigten. */
export function claudeProcessingLocation(): string {
  return claudeProvider() === 'bedrock'
    ? `AWS Bedrock, ${bedrockRegion()} (EU)`
    : 'Anthropic API (USA)';
}

const BEDROCK_DEFAULTS = {
  haiku: 'eu.anthropic.claude-haiku-4-5-20251001-v1:0',
  sonnet: 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
};

/**
 * Anthropic-model-id → Bedrock-id (EU-inferensprofil). Kan overstyres med
 * BEDROCK_MODEL_HAIKU / BEDROCK_MODEL_SONNET / BEDROCK_MODEL_OPUS.
 */
export function bedrockModelId(model: unknown): string {
  const m = typeof model === 'string' ? model.trim() : '';
  if (/^(eu|us|apac|global)\.|^anthropic\.|^arn:/.test(m)) return m;
  const haiku = process.env.BEDROCK_MODEL_HAIKU?.trim() || BEDROCK_DEFAULTS.haiku;
  const sonnet = process.env.BEDROCK_MODEL_SONNET?.trim() || BEDROCK_DEFAULTS.sonnet;
  if (/opus/i.test(m)) return process.env.BEDROCK_MODEL_OPUS?.trim() || sonnet;
  if (/sonnet/i.test(m)) return sonnet;
  return haiku;
}

let bedrockClient: AnthropicBedrock | null = null;
function getBedrock(): AnthropicBedrock {
  if (!bedrockClient) {
    bedrockClient = new AnthropicBedrock({
      awsRegion: bedrockRegion(),
      awsAccessKey: process.env.BUDR_AWS_ACCESS_KEY_ID?.trim() ?? '',
      awsSecretKey: process.env.BUDR_AWS_SECRET_ACCESS_KEY?.trim() ?? '',
      maxRetries: 1,
    });
  }
  return bedrockClient;
}

function errorResponse(e: unknown): Response {
  const err = e as { status?: number; error?: unknown; message?: string };
  const status = typeof err.status === 'number' ? err.status : 502;
  const body = err.error ?? { type: 'error', error: { message: err.message ?? 'bedrock_error' } };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function bedrockFetch(body: Record<string, unknown>): Promise<Response> {
  const client = getBedrock();
  const params = { ...body, model: bedrockModelId(body.model) } as Parameters<
    typeof client.messages.create
  >[0];

  if (!body.stream) {
    try {
      const msg = await client.messages.create({ ...params, stream: false });
      return new Response(JSON.stringify(msg), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    } catch (e) {
      return errorResponse(e);
    }
  }

  let events: AsyncIterable<{ type: string }>;
  try {
    events = (await client.messages.create({ ...params, stream: true })) as AsyncIterable<{
      type: string;
    }>;
  } catch (e) {
    return errorResponse(e);
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of events) {
          controller.enqueue(encoder.encode(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`));
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'stream_error';
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ type: 'error', error: { message } })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

/**
 * Kalder Claude Messages API hos den valgte udbyder. `apiKey` bruges kun ved direkte Anthropic
 * (standard: ANTHROPIC_API_KEY).
 */
export async function claudeMessagesFetch(
  body: Record<string, unknown>,
  opts: { apiKey?: string; signal?: AbortSignal } = {}
): Promise<Response> {
  if (claudeProvider() === 'bedrock') return bedrockFetch(body);
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opts.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      ...(body.stream ? { accept: 'text/event-stream' } : {}),
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
}

/**
 * Nøglen kalderne tjekker for, før de kalder Claude. Ved Bedrock findes der ingen Anthropic-nøgle;
 * så returneres en markør, når AWS-adgangen er sat op (den bruges ikke til noget).
 */
export function claudeApiKey(): string | undefined {
  if (claudeProvider() === 'bedrock') return claudeConfigured() ? 'bedrock' : undefined;
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
}

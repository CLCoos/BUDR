import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
};

function extractAllText(data: AnthropicMessageResponse): string {
  const parts =
    data.content
      ?.filter((c) => c.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text!.trim())
      .filter(Boolean) ?? [];
  return parts.join('\n\n').trim();
}

function isRetryableModelError(status: number, body: string): boolean {
  const b = body.toLowerCase();
  if (status === 404) return true;
  if (status === 400 && (b.includes('model') || b.includes('not_found'))) return true;
  return false;
}

function polishModelCandidates(): string[] {
  const fromEnv = process.env.ANTHROPIC_JOURNAL_POLISH_MODEL?.trim();
  const fallbacks = [
    fromEnv,
    ANTHROPIC_CHAT_MODEL,
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
  ].filter((m): m is string => typeof m === 'string' && m.length > 0);
  return [...new Set(fallbacks)];
}

/**
 * Kalder Anthropic Messages API med model-fallback (alias/snapshots varierer pr. konto).
 */
export async function callAnthropicJournalPolish(params: {
  apiKey: string;
  system: string;
  userMessage: string;
  maxTokens: number;
}): Promise<
  { ok: true; text: string } | { ok: false; status: number; body: string; lastModel: string }
> {
  const models = polishModelCandidates();
  let lastStatus = 502;
  let lastBody = '';
  let lastModel = '';

  for (const model of models) {
    lastModel = model;
    let res: Response;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': params.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: params.maxTokens,
          system: params.system,
          messages: [{ role: 'user', content: params.userMessage }],
        }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, status: 502, body: msg, lastModel: model };
    }

    const raw = await res.text();
    if (!res.ok) {
      lastStatus = res.status;
      lastBody = raw;
      if (isRetryableModelError(res.status, raw)) {
        console.warn(
          '[anthropicJournalPolish] model failed, retrying:',
          model,
          res.status,
          raw.slice(0, 200)
        );
        continue;
      }
      return { ok: false, status: res.status, body: raw, lastModel: model };
    }

    let data: AnthropicMessageResponse;
    try {
      data = JSON.parse(raw) as AnthropicMessageResponse;
    } catch {
      return { ok: false, status: 502, body: 'Invalid JSON from Anthropic', lastModel: model };
    }

    const text = extractAllText(data);
    if (text) {
      return { ok: true, text };
    }
    lastBody = 'empty content';
    continue;
  }

  return { ok: false, status: lastStatus, body: lastBody, lastModel };
}

/**
 * `/api/ai/chat-completion` taler OpenAI-format med klienterne (choices[0].message.content og
 * choices[0].delta.content). Her oversættes til og fra Claude Messages API, så ruten kan gå
 * gennem `claudeMessagesFetch` uden en tredjeparts-SDK imellem.
 */
import type { SafeChatCompletionParams } from './chatCompletionParams';

type OpenAiMessage = { role?: unknown; content?: unknown };
type ClaudeMessage = { role: 'user' | 'assistant'; content: string };

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) =>
        p && typeof p === 'object' && typeof (p as { text?: unknown }).text === 'string'
          ? (p as { text: string }).text
          : ''
      )
      .join('');
  }
  return '';
}

export function toClaudeRequest(
  model: string,
  messages: unknown[],
  params: SafeChatCompletionParams
): Record<string, unknown> {
  const system: string[] = [];
  const out: ClaudeMessage[] = [];
  for (const raw of messages) {
    const m = (raw ?? {}) as OpenAiMessage;
    const text = textOf(m.content);
    if (!text.trim()) continue;
    if (m.role === 'system') {
      system.push(text);
      continue;
    }
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const prev = out[out.length - 1];
    // Claude kræver skiftevis user/assistant; sammenhængende beskeder fra samme rolle slås sammen.
    if (prev && prev.role === role) prev.content += `\n\n${text}`;
    else out.push({ role, content: text });
  }
  if (out[0]?.role === 'assistant') out.unshift({ role: 'user', content: '…' });

  const body: Record<string, unknown> = {
    model,
    max_tokens: Math.min(
      8192,
      Math.max(1, Math.round(params.max_completion_tokens ?? params.max_tokens ?? 1024))
    ),
    messages: out,
  };
  if (system.length) body.system = system.join('\n\n');
  if (params.temperature !== undefined)
    body.temperature = Math.min(1, Math.max(0, params.temperature));
  if (params.top_p !== undefined) body.top_p = params.top_p;
  if (params.stop !== undefined) {
    body.stop_sequences = Array.isArray(params.stop) ? params.stop : [params.stop];
  }
  return body;
}

const FINISH: Record<string, string> = {
  end_turn: 'stop',
  stop_sequence: 'stop',
  max_tokens: 'length',
};

export function toOpenAiCompletion(claude: {
  id?: string;
  model?: string;
  content?: Array<{ type?: string; text?: string }>;
  stop_reason?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number };
}) {
  const text = (claude.content ?? [])
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('');
  const prompt = claude.usage?.input_tokens ?? 0;
  const completion = claude.usage?.output_tokens ?? 0;
  return {
    id: claude.id ?? 'chatcmpl',
    object: 'chat.completion',
    model: claude.model ?? '',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: FINISH[claude.stop_reason ?? ''] ?? 'stop',
      },
    ],
    usage: {
      prompt_tokens: prompt,
      completion_tokens: completion,
      total_tokens: prompt + completion,
    },
  };
}

/** Læser Claudes SSE-stream og giver tekstbidder videre i OpenAI-chunk-format. */
export async function* claudeStreamToOpenAiChunks(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<{ choices: [{ index: 0; delta: { content: string } }] }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      let ev: {
        type?: string;
        delta?: { type?: string; text?: string };
        error?: { message?: string };
      };
      try {
        ev = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }
      if (ev.type === 'error') throw new Error(ev.error?.message ?? 'stream_error');
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
        yield { choices: [{ index: 0, delta: { content: ev.delta.text } }] };
      }
    }
  }
}

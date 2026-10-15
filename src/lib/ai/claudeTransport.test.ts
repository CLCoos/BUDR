import { afterEach, describe, expect, it, vi } from 'vitest';
import { bedrockModelId, claudeApiKey, claudeProvider } from './claudeTransport';
import { claudeStreamToOpenAiChunks, toClaudeRequest, toOpenAiCompletion } from './openaiCompat';

afterEach(() => vi.unstubAllEnvs());

describe('claudeTransport', () => {
  it('bruger Anthropic som standard og Bedrock når AI_PROVIDER=bedrock', () => {
    vi.stubEnv('AI_PROVIDER', '');
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test');
    expect(claudeProvider()).toBe('anthropic');
    expect(claudeApiKey()).toBe('sk-test');

    vi.stubEnv('AI_PROVIDER', 'bedrock');
    vi.stubEnv('BUDR_AWS_ACCESS_KEY_ID', '');
    expect(claudeProvider()).toBe('bedrock');
    expect(claudeApiKey()).toBeUndefined();
    vi.stubEnv('BUDR_AWS_ACCESS_KEY_ID', 'AKIA');
    vi.stubEnv('BUDR_AWS_SECRET_ACCESS_KEY', 'secret');
    expect(claudeApiKey()).toBe('bedrock');
  });

  it('oversætter model-id til EU-inferensprofiler', () => {
    expect(bedrockModelId('claude-haiku-4-5-20251001')).toMatch(/^eu\.anthropic\.claude-haiku/);
    expect(bedrockModelId('claude-sonnet-4-5')).toMatch(/^eu\.anthropic\.claude-sonnet/);
    expect(bedrockModelId('eu.anthropic.custom-v1:0')).toBe('eu.anthropic.custom-v1:0');
    vi.stubEnv('BEDROCK_MODEL_HAIKU', 'eu.anthropic.other');
    expect(bedrockModelId('claude-3-haiku-20240307')).toBe('eu.anthropic.other');
  });
});

describe('openaiCompat', () => {
  it('flytter system ud og slår samme rolle sammen', () => {
    const body = toClaudeRequest(
      'claude-haiku-4-5',
      [
        { role: 'system', content: 'Vær kort' },
        { role: 'user', content: 'Hej' },
        { role: 'user', content: [{ type: 'text', text: 'Igen' }] },
        { role: 'assistant', content: 'Hej!' },
      ],
      { temperature: 2, max_tokens: 50, stop: 'STOP' }
    );
    expect(body).toEqual({
      model: 'claude-haiku-4-5',
      max_tokens: 50,
      system: 'Vær kort',
      temperature: 1,
      stop_sequences: ['STOP'],
      messages: [
        { role: 'user', content: 'Hej\n\nIgen' },
        { role: 'assistant', content: 'Hej!' },
      ],
    });
  });

  it('giver OpenAI-svar tilbage', () => {
    const out = toOpenAiCompletion({
      id: 'm1',
      content: [{ type: 'text', text: 'Svar' }],
      stop_reason: 'max_tokens',
      usage: { input_tokens: 3, output_tokens: 2 },
    });
    expect(out.choices[0]).toEqual({
      index: 0,
      message: { role: 'assistant', content: 'Svar' },
      finish_reason: 'length',
    });
    expect(out.usage.total_tokens).toBe(5);
  });

  it('læser SSE-stream til OpenAI-chunks', async () => {
    const sse = [
      'event: message_start\ndata: {"type":"message_start"}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hej "}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"med dig"}}\n\n',
    ];
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        // del midt i en linje for at teste buffering
        const all = sse.join('');
        c.enqueue(enc.encode(all.slice(0, 70)));
        c.enqueue(enc.encode(all.slice(70)));
        c.close();
      },
    });
    const texts: string[] = [];
    for await (const ch of claudeStreamToOpenAiChunks(body))
      texts.push(ch.choices[0].delta.content);
    expect(texts).toEqual(['Hej ', 'med dig']);
  });
});

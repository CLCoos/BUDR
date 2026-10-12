import { describe, expect, it } from 'vitest';
import { sanitizeChatCompletionParameters } from './chatCompletionParams';

describe('sanitizeChatCompletionParameters', () => {
  it('keeps the sampling fields the app actually sends', () => {
    expect(
      sanitizeChatCompletionParameters({
        max_tokens: 80,
        temperature: 0.85,
      })
    ).toEqual({ max_tokens: 80, temperature: 0.85 });
  });

  it('drops endpoint and credential overrides', () => {
    expect(
      sanitizeChatCompletionParameters({
        max_tokens: 500,
        temperature: 0.5,
        api_key: 'os.environ/SUPABASE_SERVICE_ROLE_KEY',
        api_base: 'https://example.invalid/v1',
        base_url: 'https://example.invalid/v1',
        headers: { Authorization: 'Bearer stolen' },
        extra_headers: { 'x-api-key': 'stolen' },
        custom_llm_provider: 'openai',
        organization: 'org-attacker',
      })
    ).toEqual({ max_tokens: 500, temperature: 0.5 });
  });

  it('drops non-numeric sampling values', () => {
    expect(
      sanitizeChatCompletionParameters({
        temperature: '0.9',
        max_tokens: { n: 10 },
        stop: ['OK', 1],
      })
    ).toEqual({});
  });

  it('ignores non-objects', () => {
    expect(sanitizeChatCompletionParameters(null)).toEqual({});
    expect(sanitizeChatCompletionParameters(['api_base'])).toEqual({});
    expect(sanitizeChatCompletionParameters('api_base')).toEqual({});
  });
});

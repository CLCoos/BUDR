import { afterEach, describe, expect, it, vi } from 'vitest';
import { bedrockModelId, claudeApiKey, claudeProvider } from './claudeTransport';

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

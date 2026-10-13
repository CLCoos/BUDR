/**
 * Client-supplied completion options for `/api/ai/chat-completion`.
 * Only sampling fields are forwarded. Connection fields (`api_key`, `api_base`,
 * `base_url`, headers, provider overrides) stay server-side so a caller cannot
 * redirect the provider key or read process env via the SDK's `os.environ/` key prefix.
 */

export type SafeChatCompletionParams = {
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  top_p?: number;
  stop?: string | string[];
};

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stopValue(value: unknown): string | string[] | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value;
  return undefined;
}

export function sanitizeChatCompletionParameters(parameters: unknown): SafeChatCompletionParams {
  if (parameters === null || typeof parameters !== 'object' || Array.isArray(parameters)) {
    return {};
  }

  const source = parameters as Record<string, unknown>;
  const safe: SafeChatCompletionParams = {};
  const temperature = finiteNumber(source.temperature);
  const maxTokens = finiteNumber(source.max_tokens);
  const maxCompletionTokens = finiteNumber(source.max_completion_tokens);
  const topP = finiteNumber(source.top_p);
  const stop = stopValue(source.stop);
  if (temperature !== undefined) safe.temperature = temperature;
  if (maxTokens !== undefined) safe.max_tokens = maxTokens;
  if (maxCompletionTokens !== undefined) safe.max_completion_tokens = maxCompletionTokens;
  if (topP !== undefined) safe.top_p = topP;
  if (stop !== undefined) safe.stop = stop;
  return safe;
}

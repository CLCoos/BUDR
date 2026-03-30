import { callAIEndpoint } from './aiClient';
import { createClient } from '@/lib/supabase/client';

const ENDPOINT = '/api/ai/chat-completion';

export async function getChatCompletion(
  provider: string,
  model: string,
  messages: object[],
  parameters: object = {}
) {
  return callAIEndpoint(ENDPOINT, {
    provider,
    model,
    messages,
    stream: false,
    parameters,
  });
}

export async function getStreamingChatCompletion(
  provider: string,
  model: string,
  messages: object[],
  onChunk: (chunk: any) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  parameters: object = {}
) {
  try {
    let accessToken: string | undefined;
    if (typeof window !== 'undefined') {
      const supabase = createClient();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token;
      }
    }

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ provider, model, messages, stream: true, parameters }),
    });

    if (!response.ok) {
      const data = await response.json();
      if (response.status === 429) {
        throw new Error('Du har ramt dagens gratis AI-grænse. Prøv igen i morgen eller opgrader til premium.');
      }
      const detail =
        typeof data.details === 'string' && data.details.trim().length > 0 ? data.details.trim() : null;
      throw new Error(detail || data.error || `HTTP error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is not readable');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk' && data.chunk) {
              onChunk(data.chunk);
            } else if (data.type === 'done') onComplete();
            else if (data.type === 'error') {
              console.error('API Route Error:', {
                error: data.error,
                details: data.details,
              });
              onError(new Error(data.error));
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
    onError(error instanceof Error ? error : new Error('Streaming error'));
  }
}

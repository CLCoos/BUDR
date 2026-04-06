'use client';

import { useState, useCallback } from 'react';
import { getChatCompletion, getStreamingChatCompletion } from '@/lib/ai/chatCompletion';

function normalizeChatError(err: unknown): Error {
  const message = err instanceof Error ? err.message : 'Unknown error';
  if (message.includes('Daily AI limit reached') || message.includes('429')) {
    return new Error(
      'Du har ramt dagens gratis AI-grænse. Prøv igen i morgen eller opgrader til premium.'
    );
  }
  return err instanceof Error ? err : new Error(message);
}

export function useChat(provider: string, model: string, streaming: boolean = true) {
  const [response, setResponse] = useState('');
  const [fullResponse, setFullResponse] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(
    async (messages: object[], parameters: object = {}) => {
      setResponse('');
      setFullResponse(streaming ? [] : null);
      setIsLoading(true);
      setError(null);

      try {
        if (streaming) {
          await getStreamingChatCompletion(
            provider,
            model,
            messages,
            (chunk) => {
              setFullResponse((prev: unknown) => [
                ...((Array.isArray(prev) ? prev : []) as unknown[]),
                chunk,
              ]);
              const c = chunk as { choices?: { delta?: { content?: string } }[] };
              const content = c?.choices?.[0]?.delta?.content;
              if (content) setResponse((prev) => prev + content);
            },
            () => setIsLoading(false),
            (err) => {
              setError(normalizeChatError(err));
              setIsLoading(false);
            },
            parameters
          );
        } else {
          const result = (await getChatCompletion(provider, model, messages, parameters)) as {
            choices?: { message?: { content?: string } }[];
          };
          setFullResponse(result);
          setResponse(result?.choices?.[0]?.message?.content || '');
          setIsLoading(false);
        }
      } catch (err) {
        setError(normalizeChatError(err));
        setIsLoading(false);
      }
    },
    [provider, model, streaming]
  );

  return { response, fullResponse, isLoading, error, sendMessage };
}

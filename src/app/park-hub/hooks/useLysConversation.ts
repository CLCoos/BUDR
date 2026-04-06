'use client';

import { useCallback, useState } from 'react';
import type { LysChatMessage } from '@/app/api/lys-chat/route';
import { phaseDaLabel, type LysPhase } from '../lib/lysTheme';

const MOCK_SNIPPETS = `Seneste fra Lys (tidligere samtaler):
- "Hvordan sov du i nat?"
- "Det er okay at gå langsomt."

Ældre noter:
• Anders fortalte at en gåtur hjalp i går.
• Lys spurgte ind til søvn — kort svar om urolig nat.
• Lille sejr: hjalp med at sætte vasketøj over.`;

type ThoughtSteps = { situation?: string; thought?: string; feeling?: string };

type UseLysConversationOpts = {
  firstName: string;
  phase: LysPhase;
  moodLabel: string | null;
  /** Kaldes når Lys returnerer et rigtigt svar (HTTP 200) efter en brugerbesked. */
  onAssistantSuccess?: () => void;
};

export function useLysConversation({
  firstName,
  phase,
  moodLabel,
  onAssistantSuccess,
}: UseLysConversationOpts) {
  const [messages, setMessages] = useState<LysChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendToLys = useCallback(
    async (
      userText: string,
      extra?: Partial<{
        messagesOverride: LysChatMessage[];
        historyLimit: number;
      }>
    ) => {
      const trimmed = userText.trim();
      if (!trimmed) return null;

      const nextUser: LysChatMessage = { role: 'user', content: trimmed };
      const base = extra?.messagesOverride ?? messages;
      const updated = [...base, nextUser];
      const limit = extra?.historyLimit ?? 12;
      const history = updated.slice(-limit);

      setMessages(updated);
      setLoading(true);
      try {
        const res = await fetch('/api/lys-chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            residentFirstName: firstName,
            timeOfDay: phaseDaLabel(phase),
            mood: moodLabel,
            sessionContext: MOCK_SNIPPETS,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };

        if (!res.ok) {
          const reply =
            res.status === 429
              ? 'Der blev sendt mange beskeder på kort tid. Vent lidt og prøv igen.'
              : res.status === 503
                ? 'Lys er ikke klar lige nu. Prøv igen om et øjeblik.'
                : ((data.error?.trim() &&
                  !data.error.includes('API') &&
                  !data.error.includes('anthropic')
                    ? data.error
                    : null) ??
                  `Jeg kunne ikke svare lige nu. Tjek dit net — eller prøv igen om lidt.`);
          setMessages((curr) => [...curr, { role: 'assistant', content: reply }]);
          return reply;
        }

        const reply =
          data.text ??
          data.error ??
          `Hej ${firstName}. Tak for at du deler det. Vil du sige lidt mere, når du er klar?`;
        setMessages((curr) => [...curr, { role: 'assistant', content: reply }]);
        queueMicrotask(() => onAssistantSuccess?.());
        return reply;
      } catch {
        const fallback = `Hej ${firstName}. Det ser ud til, at nettet driller. Tjek forbindelsen og prøv igen om lidt.`;
        setMessages((curr) => [...curr, { role: 'assistant', content: fallback }]);
        return fallback;
      } finally {
        setLoading(false);
      }
    },
    [messages, firstName, phase, moodLabel, onAssistantSuccess]
  );

  const sendCounterThought = useCallback(
    async (thoughtSteps: ThoughtSteps) => {
      const trigger: LysChatMessage = {
        role: 'user',
        content: 'Giv en mild modtanke og afslut med ét kort spørgsmål.',
      };
      setMessages((m) => [...m, trigger]);
      setLoading(true);
      try {
        const res = await fetch('/api/lys-chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            messages: [trigger],
            residentFirstName: firstName,
            timeOfDay: phaseDaLabel(phase),
            mood: moodLabel,
            sessionContext: MOCK_SNIPPETS,
            mode: 'counter_thought',
            thoughtSteps,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };

        if (!res.ok) {
          const reply =
            res.status === 429
              ? 'Vent lidt før du prøver igen — der blev sendt mange beskeder.'
              : res.status === 503
                ? 'Lys er ikke tilgængelig lige nu. Prøv igen om lidt.'
                : `Det lykkedes ikke lige nu. Tjek nettet og prøv igen.`;
          setMessages((curr) => [...curr, { role: 'assistant', content: reply }]);
          return reply;
        }

        const reply =
          data.text ??
          data.error ??
          `Hvad hvis man også kunne se det sådan her: du gør dit bedste, og det er nok lige nu. Hvordan føles det at høre?`;
        setMessages((curr) => [...curr, { role: 'assistant', content: reply }]);
        return reply;
      } catch {
        const fallback = `Du er ikke alene med det her. Prøv igen, når dit net er stabilt.`;
        setMessages((curr) => [...curr, { role: 'assistant', content: fallback }]);
        return fallback;
      } finally {
        setLoading(false);
      }
    },
    [firstName, phase, moodLabel]
  );

  const resetThread = useCallback(() => setMessages([]), []);

  return { messages, loading, sendToLys, sendCounterThought, resetThread, setMessages };
}

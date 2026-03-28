'use client';

import { useCallback, useState } from 'react';
import type { LysChatMessage } from '@/app/api/lys-chat/route';
import { phaseDaLabel, type LysPhase } from '../lib/lysTheme';

const MOCK_SNIPPETS = `• Anders fortalte at en gåtur hjalp i går.
• Lys spurgte ind til søvn — kort svar om urolig nat.
• Lille sejr: hjalp med at sætte vasketøj over.`;

type ThoughtSteps = { situation?: string; thought?: string; feeling?: string };

type UseLysConversationOpts = {
  firstName: string;
  phase: LysPhase;
  moodLabel: string | null;
};

export function useLysConversation({ firstName, phase, moodLabel }: UseLysConversationOpts) {
  const [messages, setMessages] = useState<LysChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendToLys = useCallback(
    async (
      userText: string,
      extra?: Partial<{
        messagesOverride: LysChatMessage[];
      }>,
    ) => {
      const trimmed = userText.trim();
      if (!trimmed) return null;

      const nextUser: LysChatMessage = { role: 'user', content: trimmed };
      const base = extra?.messagesOverride ?? messages;
      const updated = [...base, nextUser];
      const history = updated.slice(-12);

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
        const data = (await res.json()) as { text?: string; error?: string };
        const reply =
          data.text ??
          data.error ??
          `Hej ${firstName}. Tak for at du deler det. Vil du sige lidt mere, når du er klar?`;
        setMessages(curr => [...curr, { role: 'assistant', content: reply }]);
        return reply;
      } catch {
        const fallback = `Hej ${firstName}. Jeg hører dig. Tag den tid, du har brug for.`;
        setMessages(curr => [...curr, { role: 'assistant', content: fallback }]);
        return fallback;
      } finally {
        setLoading(false);
      }
    },
    [messages, firstName, phase, moodLabel],
  );

  const sendCounterThought = useCallback(
    async (thoughtSteps: ThoughtSteps) => {
      const trigger: LysChatMessage = {
        role: 'user',
        content: 'Giv en mild modtanke og afslut med ét kort spørgsmål.',
      };
      setMessages(m => [...m, trigger]);
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
        const data = (await res.json()) as { text?: string; error?: string };
        const reply =
          data.text ??
          data.error ??
          `Hvad hvis man også kunne se det sådan her: du gør dit bedste, og det er nok lige nu. Hvordan føles det at høre?`;
        setMessages(curr => [...curr, { role: 'assistant', content: reply }]);
        return reply;
      } catch {
        const fallback = `Hvad hvis man også kunne se det sådan her: du er ikke alene med det her. Hvordan føles det at høre?`;
        setMessages(curr => [...curr, { role: 'assistant', content: fallback }]);
        return fallback;
      } finally {
        setLoading(false);
      }
    },
    [firstName, phase, moodLabel],
  );

  const resetThread = useCallback(() => setMessages([]), []);

  return { messages, loading, sendToLys, sendCounterThought, resetThread, setMessages };
}

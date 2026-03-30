'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useChat } from '@/lib/hooks/useChat';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';
import { toast } from 'sonner';

const SYSTEM_PROMPT =
  'Du er Lys — en varm, empatisk ledsager i en dansk mental sundhedsapp (BUDR2.0). Du svarer kort og konkret (oftest 1–3 afsnit), på dansk, uden at moralisere eller diagnosticere. Hvis brugeren er i akut fare, opfordrer du til at kontakte 112 eller lægevagten. Brug et enkelt, blødt emoji når det føles naturligt.';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

export default function LysChatView() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const assistantPending = useRef(false);

  const { sendMessage, response, isLoading, error } = useChat(
    'ANTHROPIC',
    ANTHROPIC_CHAT_MODEL,
    false
  );

  useEffect(() => {
    if (error) {
      assistantPending.current = false;
      toast.error(error.message);
    }
  }, [error]);

  useEffect(() => {
    if (!isLoading && assistantPending.current && response.trim()) {
      setMessages((m) => [...m, { role: 'assistant', content: response.trim() }]);
      assistantPending.current = false;
    }
  }, [isLoading, response]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMsg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    assistantPending.current = true;

    const apiMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...next.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    await sendMessage(apiMessages, { max_tokens: 600, temperature: 0.75 });
  };

  return (
    <div className="min-h-screen gradient-midnight flex flex-col pb-[5.5rem]">
      <header className="sticky top-0 z-20 bg-midnight-900/95 backdrop-blur-xl border-b border-midnight-700/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/daily-structure"
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-sunrise-400 hover:bg-midnight-800 transition-colors"
            aria-label="Tilbage"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-midnight-50 text-lg">Tal med Lys</h1>
            <p className="text-xs text-midnight-400 truncate">Din ledsager — skriv som du taler</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 pt-4 pb-[7.5rem]">
        {messages.length === 0 && !isLoading && (
          <div className="rounded-2xl border border-aurora-violet/25 bg-midnight-800/50 px-4 py-5 text-center text-sm text-midnight-300 leading-relaxed">
            Hej. Jeg er Lys. Hvad har du på hjerte i dag? Du kan skrive kort eller langt — jeg læser med ro.
          </div>
        )}

        <div className="space-y-3 mt-4">
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}-${m.content.slice(0, 12)}`}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-sunrise-400/20 text-midnight-50 border border-sunrise-400/25'
                    : 'bg-midnight-800/90 text-midnight-100 border border-midnight-600/60'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-midnight-800/90 border border-midnight-600/60 text-sm text-midnight-400">
                Lys tænker…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="fixed left-0 right-0 z-40 bottom-0 max-w-lg mx-auto bg-midnight-900/98 backdrop-blur-xl border-t border-midnight-700/60 px-3 pt-2 pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Skriv til Lys…"
            rows={1}
            className="flex-1 min-h-[48px] max-h-32 rounded-2xl border border-midnight-600 bg-midnight-800 px-4 py-3 text-sm text-midnight-50 placeholder-midnight-500 outline-none focus:border-sunrise-400 resize-none"
            disabled={isLoading}
            aria-label="Besked til Lys"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 min-h-[48px] min-w-[48px] rounded-2xl bg-gradient-to-br from-sunrise-400 to-sunrise-500 text-midnight-950 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
            aria-label="Send"
          >
            <Send className="w-5 h-5" aria-hidden />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

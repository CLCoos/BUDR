'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2, BrainCircuit } from 'lucide-react';

type Role = 'user' | 'assistant';
interface Message { role: Role; content: string }

const SUGGESTIONS = [
  'Hvem er beboerne her, og hvad er vigtigt at vide?',
  'Hvad gør jeg hvis en beboer nægter at tage sin medicin?',
  'Hvordan håndterer jeg en konflikt mellem to beboere?',
  'Hvad skal jeg skrive i journalen efter en hændelse?',
  'Hvornår må man anvende magt ifølge loven?',
  'En beboer vil ikke forlade sit værelse. Hvad gør jeg?',
];

export default function AssistantClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setStreaming(true);

    // Placeholder assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/portal/staff-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Ukendt fejl' }));
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: `Beklager, noget gik galt: ${(err as { error?: string }).error ?? 'prøv igen'}` },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: accumulated },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Forbindelsesfejl — tjek din internetforbindelse og prøv igen.' },
      ]);
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-white shrink-0">
        <div className="w-9 h-9 rounded-lg bg-[#1D9E75]/10 flex items-center justify-center">
          <BrainCircuit size={18} className="text-[#1D9E75]" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">Faglig støtte</div>
          <div className="text-xs text-gray-400">Erfaren kollega · Fortrolig · Altid tilgængelig</div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Trash2 size={13} />
            Ryd samtale
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-[#1D9E75]/10 flex items-center justify-center mb-4">
              <BrainCircuit size={28} className="text-[#1D9E75]" />
            </div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">Hvad kan jeg hjælpe med?</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              Spørg om beboere, faglige situationer, lovgivning eller hvad du ellers har brug for at vide.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="text-left text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2.5 transition-colors leading-snug"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#1D9E75]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BrainCircuit size={13} className="text-[#1D9E75]" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#1D9E75] text-white rounded-tr-sm'
                    : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm'
                }`}
              >
                {msg.content}
                {msg.role === 'assistant' && msg.content === '' && streaming && (
                  <span className="inline-flex gap-0.5 items-center">
                    <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
        <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-[#1D9E75] transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv dit spørgsmål..."
            disabled={streaming}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none max-h-32 leading-relaxed"
            style={{ minHeight: '1.5rem' }}
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={!input.trim() || streaming}
            className="w-8 h-8 rounded-lg bg-[#1D9E75] flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#179060] transition-colors"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          Samtalen gemmes ikke · Til faglig vejledning — erstatter ikke akut hjælp
        </p>
      </div>
    </div>
  );
}

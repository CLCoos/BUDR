'use client';

import React, { useState, useEffect, useRef } from 'react';
import { KrapState } from './JournalView';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';

interface KrapNotesProps {
  krap: KrapState;
  onChange: (krap: KrapState) => void;
}

const krapFields: {
  key: keyof KrapState;
  label: string;
  emoji: string;
  description: string;
  placeholder: string;
  accent: string;
}[] = [
  {
    key: 'krop',
    label: 'Krop',
    emoji: '🫀',
    description: 'Hvad mærker du i kroppen?',
    placeholder: 'Fx spænding i skuldrene, uro i maven...',
    accent: '#F472B6',
  },
  {
    key: 'rolle',
    label: 'Rolle',
    emoji: '🎭',
    description: 'Hvilken rolle spiller du i dag?',
    placeholder: 'Fx forælder, kollega, ven, patient...',
    accent: '#A78BFA',
  },
  {
    key: 'affekt',
    label: 'Affekt',
    emoji: '💭',
    description: 'Hvilke følelser er til stede?',
    placeholder: 'Fx vrede, glæde, sorg, angst, lettelse...',
    accent: '#60A5FA',
  },
  {
    key: 'plan',
    label: 'Plan',
    emoji: '🗺️',
    description: 'Hvad vil du gøre med det?',
    placeholder: 'Fx hvile, tale med nogen, sætte grænser...',
    accent: '#34D399',
  },
];

export default function KrapNotes({ krap, onChange }: KrapNotesProps) {
  const [aiInsight, setAiInsight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleChange = (key: keyof KrapState, value: string) => {
    onChange({ ...krap, [key]: value });
    if (aiInsight) setAiInsight('');
  };

  const filledCount = Object.values(krap).filter((v) => v.trim().length > 0).length;

  const handleAnalyze = () => {
    if (typeof window === 'undefined') return;
    setIsLoading(true);
    const parts = krapFields
      .filter((f) => krap[f.key].trim().length > 0)
      .map((f) => `${f.label}: ${krap[f.key].trim()}`)
      .join('\n');

    fetch('/api/ai/chat-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'ANTHROPIC',
        model: ANTHROPIC_CHAT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Du er en empatisk AI-coach i en dansk mental sundhedsapp. Du analyserer brugerens KRAP-noter (Krop, Rolle, Affekt, Plan) og giver en kort, personlig indsigt. Max 3 sætninger. Vær varm, konkret og undgå klichéer. Peg på sammenhænge og mønstre du ser. Afslut med en opmuntrende bemærkning.',
          },
          {
            role: 'user',
            content: `Mine KRAP-noter i dag:\n${parts}\n\nHvad ser du af mønstre eller sammenhænge?`,
          },
        ],
        stream: false,
        parameters: { max_tokens: 150, temperature: 0.75 },
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const text = d?.choices?.[0]?.message?.content;
        if (text && mountedRef.current) setAiInsight(text.trim());
      })
      .catch(() => {
        /* silently fail */
      })
      .finally(() => {
        if (mountedRef.current) setIsLoading(false);
      });
  };

  return (
    <div className="card-dark">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🔍</span>
        <h2 className="font-display text-base font-bold text-midnight-50">KRAP-noter</h2>
        <span className="ml-auto text-xs text-midnight-400">{filledCount}/4 udfyldt</span>
      </div>
      <p className="text-xs text-midnight-500 mb-5">
        Refleksion og mønsterspotning — krop, rolle, affekt, plan
      </p>

      <div className="space-y-4">
        {krapFields.map(({ key, label, emoji, description, placeholder, accent }) => (
          <div
            key={key}
            className="rounded-2xl border p-4 transition-all duration-200"
            style={{ borderColor: `${accent}25`, background: `${accent}08` }}
          >
            <div className="flex flex-col gap-1 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{emoji}</span>
                <span className="font-display text-sm font-bold" style={{ color: accent }}>
                  {label}
                </span>
              </div>
              <span className="text-xs text-midnight-500 pl-1">{description}</span>
            </div>
            <textarea
              value={krap[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full bg-midnight-900/60 rounded-xl border border-midnight-600/50 px-3 py-2 text-sm text-midnight-100 placeholder-midnight-600 focus:outline-none focus:border-sunrise-400/50 resize-none transition-colors"
            />
            {krap[key].trim().length > 0 && (
              <p className="text-xs text-midnight-500 mt-1 text-right">
                {krap[key].trim().length} tegn
              </p>
            )}
          </div>
        ))}
      </div>

      {filledCount >= 2 && !aiInsight && (
        <div className="mt-4">
          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-aurora-violet/10 border border-aurora-violet/25 rounded-2xl px-4 py-3 text-sm text-purple-300 font-medium hover:bg-aurora-violet/15 transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span
                  className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </>
            ) : (
              <>
                <span>🔮</span>
                <span>Analyser mine mønstre med AI</span>
              </>
            )}
          </button>
        </div>
      )}

      {aiInsight && (
        <div className="mt-4 bg-aurora-violet/10 border border-aurora-violet/25 rounded-2xl px-4 py-4 animate-slide-up">
          <div className="flex items-start gap-2">
            <span className="text-base mt-0.5">🔮</span>
            <div>
              <p className="text-xs text-purple-400 font-semibold mb-1.5">
                AI-indsigt fra dine noter:
              </p>
              <p className="text-sm text-midnight-200 leading-relaxed">{aiInsight}</p>
            </div>
          </div>
          <button
            onClick={() => setAiInsight('')}
            className="mt-3 text-xs text-midnight-500 hover:text-midnight-300 transition-colors"
          >
            Skjul indsigt
          </button>
        </div>
      )}

      {filledCount >= 3 && !aiInsight && (
        <div className="mt-3 bg-sunrise-400/10 border border-sunrise-400/20 rounded-2xl px-4 py-3 flex items-start gap-2 animate-slide-up">
          <span className="text-base mt-0.5">💡</span>
          <p className="text-xs text-sunrise-300 font-medium">
            Godt arbejde! Kig på sammenhængen mellem krop, rolle og affekt — ser du et mønster?
          </p>
        </div>
      )}
    </div>
  );
}

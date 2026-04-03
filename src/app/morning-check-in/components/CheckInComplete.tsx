'use client';

import React, { useEffect, useState, useRef } from 'react';
import { CheckInData } from './MorningCheckInFlow';
import Lys from '@/components/Lys';
import StickyPrimaryFooter from '@/components/StickyPrimaryFooter';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';

interface Props {
  data: CheckInData;
  onComplete: () => void;
}

const energyForecast: Record<
  number,
  { label: string; emoji: string; accent: string; tasks: string }
> = {
  1: { label: 'Rolig dag', emoji: '🌙', accent: '#60A5FA', tasks: '2–3 lette opgaver' },
  2: { label: 'Let dag', emoji: '🌤️', accent: '#A78BFA', tasks: '3–4 opgaver' },
  3: { label: 'Normal dag', emoji: '⛅', accent: '#FB923C', tasks: '5–6 opgaver' },
  4: { label: 'Aktiv dag', emoji: '🌞', accent: '#34D399', tasks: '7–8 opgaver' },
  5: { label: 'Fuld dag', emoji: '☀️', accent: '#FB923C', tasks: '9–10 opgaver' },
};

const fallbackMessages: Record<string, string> = {
  glad: 'Din gode energi er smittende! Lad os udnytte det til noget meningsfyldt i dag.',
  rolig: 'Ro er din styrke i dag. Tag tingene i dit eget tempo.',
  træt: 'Det er okay at have en træt dag. Vi tager det ét skridt ad gangen.',
  urolig: 'Uro er et signal om, at noget er vigtigt for dig. Vi håndterer det sammen.',
  trist: 'Det er okay at have en trist dag. Du er ikke alene.',
  overvældet: 'Lad os dele dagen op i meget små bidder — ét ad gangen.',
};

export default function CheckInComplete({ data, onComplete }: Props) {
  const [visible, setVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState(
    fallbackMessages[data.mood] || fallbackMessages['rolig']
  );
  const [aiLoading, setAiLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Fetch personalized Claude message
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const energyLabel = energyForecast[data.energy]?.label || 'Normal dag';
    const intentionNote = data.intention
      ? ` Brugerens intention for i dag: "${data.intention}".`
      : '';
    setAiLoading(true);

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
              'Du er Lys — en varm, empatisk ledsager i en dansk mental sundhedsapp. Du sender en personlig morgenbesked til brugeren efter deres check-in. Max 2 sætninger, max 30 ord. Vær specifik, varm og nærværende. Afslut med ét relevant emoji.',
          },
          {
            role: 'user',
            content: `Brugerens morgen check-in:\n- Humør: ${data.mood}\n- Energiniveau: ${data.energy}/5 (${energyLabel})${intentionNote}\n\nSkriv en personlig morgenbesked fra Lys.`,
          },
        ],
        stream: false,
        parameters: { max_tokens: 80, temperature: 0.8 },
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const text = d?.choices?.[0]?.message?.content;
        if (text && mountedRef.current) setAiMessage(text.trim());
      })
      .catch(() => {
        /* keep fallback */
      })
      .finally(() => {
        if (mountedRef.current) setAiLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forecast = energyForecast[data.energy] || energyForecast[3];

  const getLysMood = () => {
    if (data.energy >= 4) return 'energized' as const;
    if (data.energy <= 2) return 'tired' as const;
    return 'calm' as const;
  };

  const handleStart = () => {
    setIsLoading(true);
    setTimeout(() => onComplete(), 600);
  };

  const userContext = `humør: ${data.mood}, energi: ${data.energy}/5${data.intention ? `, intention: ${data.intention}` : ''}`;

  return (
    <div className="max-w-lg mx-auto px-4 pb-12 flex flex-col items-center">
      <div
        className={`mt-4 mb-6 transition-all duration-700 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
      >
        <Lys mood={getLysMood()} size="lg" showMessage userContext={userContext} />
      </div>

      <div
        className={`text-center mb-6 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <h2 className="font-display text-2xl font-bold text-midnight-50 mb-2">
          Check-in gennemført! 🌅
        </h2>
        <p className="text-midnight-400 text-sm">Din dag er klar og tilpasset dit energiniveau</p>
      </div>

      <div
        className={`w-full mb-4 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <div
          className="rounded-3xl p-4 flex items-center gap-3 border"
          style={{ background: `${forecast.accent}12`, borderColor: `${forecast.accent}30` }}
        >
          <span className="text-4xl select-none flex-shrink-0">{forecast.emoji}</span>
          <div className="min-w-0">
            <p className="font-display font-bold text-lg text-midnight-50 break-words">
              {forecast.label}
            </p>
            <p className="text-sm text-midnight-400 mt-0.5 break-words">
              📋 {forecast.tasks} venter på dig
            </p>
          </div>
        </div>
      </div>

      {data.intention && (
        <div
          className={`w-full mb-4 bg-midnight-800/60 rounded-2xl border border-emerald-500/20 p-4 transition-all duration-700 delay-250 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <p className="text-xs text-emerald-400 font-semibold mb-1.5">🌱 Din intention i dag:</p>
          <p className="text-sm text-midnight-100 font-medium italic">
            &ldquo;{data.intention}&rdquo;
          </p>
        </div>
      )}

      <div
        className={`w-full mb-6 bg-midnight-800/60 rounded-3xl border border-aurora-violet/20 p-5 transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-aurora-violet/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-base">🔮</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-purple-400 font-semibold mb-1">Lys siger:</p>
            {aiLoading ? (
              <div className="flex items-center gap-1.5 py-1">
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
              </div>
            ) : (
              <p className="text-sm text-midnight-100 leading-relaxed font-medium">{aiMessage}</p>
            )}
          </div>
        </div>
      </div>

      <StickyPrimaryFooter>
        <button
          type="button"
          onClick={handleStart}
          disabled={isLoading}
          className="btn-primary w-full disabled:opacity-70 min-h-[52px]"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Henter din dag...
            </span>
          ) : (
            'Se min dag →'
          )}
        </button>
      </StickyPrimaryFooter>
    </div>
  );
}

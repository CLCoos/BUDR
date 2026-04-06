'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';

interface NudgeData {
  id: string;
  message: string;
  pattern: string;
  emoji: string;
  type: 'sleep' | 'mood' | 'checkin' | 'rhythm';
}

interface ProactiveNudgesProps {
  recentMoods?: number[];
  lastSleepScore?: number;
  daysSinceCheckin?: number;
  weekdayPattern?: string;
}

const fallbackNudges: NudgeData[] = [
  {
    id: 'n1',
    message:
      'Det er 3 dage siden dit sidste check-in. Vil du tage 2 minutter til at tjekke ind i dag?',
    pattern: 'Manglende check-in',
    emoji: '🌅',
    type: 'checkin',
  },
  {
    id: 'n2',
    message: 'Dine søvnscorer har været lave denne uge. Vil du prøve en kort aftenroutine i aften?',
    pattern: 'Søvnmønster',
    emoji: '🌙',
    type: 'sleep',
  },
];

export default function ProactiveNudges({
  recentMoods = [],
  lastSleepScore = 3,
  daysSinceCheckin = 0,
  weekdayPattern = '',
}: ProactiveNudgesProps) {
  const [nudges, setNudges] = useState<NudgeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [generated, setGenerated] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const generateNudges = async () => {
    setLoading(true);
    try {
      const avgMood =
        recentMoods.length > 0
          ? (recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length).toFixed(1)
          : '6.0';

      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'ANTHROPIC',
          model: ANTHROPIC_CHAT_MODEL,
          messages: [
            {
              role: 'system',
              content: `Du er en proaktiv AI-coach i en dansk mental sundhedsapp. Generer personlige, timede nudges baseret på brugerens mønstre. Svar KUN med valid JSON array (max 3 nudges):
[{"id":"n1","message":"personlig besked (max 2 sætninger)","pattern":"mønster der udløste nudge","emoji":"relevant emoji","type":"sleep|mood|checkin|rhythm"}]
Vær specifik, varm og handlingsorienteret. Undgå klichéer.`,
            },
            {
              role: 'user',
              content: `Brugerens mønstre:
- Gennemsnitlig humørscore denne uge: ${avgMood}/10
- Seneste søvnscore: ${lastSleepScore}/5
- Dage siden sidst check-in: ${daysSinceCheckin}
- Ugedagsmønster: ${weekdayPattern || 'Tirsdage og torsdage er typisk sværere'}
- Seneste humørscorer: ${recentMoods.join(', ') || '6, 5, 7, 4, 6'}

Generer 2-3 personlige, proaktive nudges.`,
            },
          ],
          stream: false,
          parameters: { max_tokens: 400, temperature: 0.8 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && mountedRef.current) {
          try {
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              setNudges(parsed);
              setGenerated(true);
            }
          } catch {
            setNudges(fallbackNudges);
            setGenerated(true);
          }
        }
      }
    } catch {
      setNudges(fallbackNudges);
      setGenerated(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-generate on mount if there's meaningful context
    if (
      daysSinceCheckin > 2 ||
      lastSleepScore < 2 ||
      (recentMoods.length > 0 && recentMoods[recentMoods.length - 1] < 4)
    ) {
      generateNudges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleNudges = nudges.filter((n) => !dismissed.has(n.id));

  if (!generated && !loading) {
    return (
      <button
        onClick={generateNudges}
        className="w-full flex items-center gap-3 bg-midnight-800/40 rounded-2xl px-4 py-3 border border-midnight-700/40 hover:border-aurora-violet/30 transition-all duration-200"
      >
        <span className="text-xl">🔔</span>
        <div className="text-left">
          <p className="text-sm font-medium text-midnight-200">Proaktive Claude-nudges</p>
          <p className="text-xs text-midnight-500">Personlige beskeder baseret på dine mønstre</p>
        </div>
        <span className="ml-auto text-xs text-purple-400 font-semibold">Generer →</span>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="bg-midnight-800/40 rounded-2xl px-4 py-4 border border-midnight-700/40 flex items-center gap-2">
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
        <span className="text-xs text-midnight-400 ml-1">Claude analyserer dine mønstre...</span>
      </div>
    );
  }

  if (visibleNudges.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleNudges.map((nudge) => (
        <div
          key={nudge.id}
          className="bg-aurora-violet/8 border border-aurora-violet/20 rounded-2xl p-4 animate-slide-up"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">{nudge.emoji}</span>
            <div className="flex-1">
              <p className="text-xs text-purple-400 font-semibold mb-1">{nudge.pattern}</p>
              <p className="text-sm text-midnight-100 leading-relaxed">{nudge.message}</p>
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, nudge.id]))}
              className="text-midnight-600 hover:text-midnight-400 transition-colors text-sm ml-1 flex-shrink-0"
              aria-label="Afvis"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

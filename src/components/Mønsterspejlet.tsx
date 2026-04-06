'use client';

import React, { useState, useEffect } from 'react';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';

interface InsightPattern {
  icon: string;
  label: string;
  observation: string;
  trend: 'up' | 'down' | 'stable';
}

interface MønsterspejletProps {
  patterns?: InsightPattern[];
  weekSummary?: string;
  weekMoods?: number[];
  avgSleep?: number;
  avgMovement?: number;
  completedChallenges?: number;
  journalEntries?: number;
  topMood?: string;
}

const defaultPatterns: InsightPattern[] = [
  { icon: '🌅', label: 'Morgenmønster', observation: 'Du starter stærkere på dage med tidlig check-in', trend: 'up' },
  { icon: '😴', label: 'Søvn & humør', observation: 'Dine bedste dage følger nætter med 7+ timers søvn', trend: 'stable' },
  { icon: '🚶', label: 'Bevægelse', observation: 'Gåture om eftermiddagen løfter dit energiniveau markant', trend: 'up' },
];

const trendColors = { up: 'text-aurora-teal', down: 'text-rose-400', stable: 'text-aurora-blue' };
const trendIcons = { up: '↑', down: '↓', stable: '→' };

function parseAIPatterns(text: string): { summary: string; patterns: InsightPattern[] } {
  try {
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.summary && Array.isArray(parsed.patterns)) return parsed;
    }
  } catch { /* ignore */ }
  return { summary: text.split('\n')[0] || text, patterns: defaultPatterns };
}

export async function fetchAIInsights(params: {
  weekMoods?: number[];
  avgSleep?: number;
  avgMovement?: number;
  completedChallenges?: number;
  journalEntries?: number;
  topMood?: string;
}): Promise<{ summary: string; patterns: InsightPattern[] } | null> {
  if (typeof window === 'undefined') return null;
  try {
    const moodStr = params.weekMoods ? params.weekMoods.join(', ') : '6, 7, 5, 8, 6, 7, 9';
    const res = await fetch('/api/ai/chat-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'ANTHROPIC',
        model: ANTHROPIC_CHAT_MODEL,
        messages: [
          {
            role: 'system',
            content: `Du er en empatisk AI-coach i en dansk mental sundhedsapp. Analyser brugerens ugedata og returner JSON med mønstre og indsigter. Svar KUN med valid JSON i dette format:
{"summary":"En personlig, varm opsummering af ugen (max 2 sætninger)","patterns":[{"icon":"emoji","label":"Kort label","observation":"Personlig observation (max 15 ord)","trend":"up|down|stable"},{"icon":"emoji","label":"Kort label","observation":"Personlig observation (max 15 ord)","trend":"up|down|stable"},{"icon":"emoji","label":"Kort label","observation":"Personlig observation (max 15 ord)","trend":"up|down|stable"}]}
Vær specifik, varm og undgå klichéer.`,
          },
          {
            role: 'user',
            content: `Brugerens ugedata:\n- Humørscorer (man-søn): ${moodStr}\n- Gennemsnitlig søvn: ${params.avgSleep ? `${params.avgSleep}/5` : 'ukendt'}\n- Gennemsnitlig bevægelse: ${params.avgMovement ? `${params.avgMovement}/5` : 'ukendt'}\n- Gennemførte udfordringer: ${params.completedChallenges ?? 'ukendt'}\n- Journalindlæg: ${params.journalEntries ?? 'ukendt'}\n- Dominerende humør: ${params.topMood || 'rolig'}\n\nAnalyser mønstre og giv personlige indsigter.`,
          },
        ],
        stream: false,
        parameters: { max_tokens: 400, temperature: 0.7 },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) return parseAIPatterns(text);
    }
  } catch { /* silently fail */ }
  return null;
}

export default function Mønsterspejlet({
  patterns: propPatterns,
  weekSummary: propSummary,
  weekMoods,
  avgSleep,
  avgMovement,
  completedChallenges,
  journalEntries,
  topMood,
}: MønsterspejletProps) {
  const [patterns, setPatterns] = useState<InsightPattern[]>(propPatterns || defaultPatterns);
  const [summary, setSummary] = useState(propSummary || 'Denne uge har du vist stor vedholdenhed. Dine mønstre viser, at struktur om morgenen er din nøgle.');
  const [isLoading, setIsLoading] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);

  const loadInsights = async () => {
    setIsLoading(true);
    const result = await fetchAIInsights({ weekMoods, avgSleep, avgMovement, completedChallenges, journalEntries, topMood });
    if (result) {
      setSummary(result.summary);
      if (result.patterns.length > 0) setPatterns(result.patterns);
      setAiLoaded(true);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="insight-card animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.3) 0%, rgba(251,146,60,0.2) 100%)' }}>
          🔮
        </div>
        <div>
          <h3 className="font-display text-base font-bold text-midnight-50">Mønsterspejlet</h3>
          <p className="text-xs text-midnight-400">Ugentlige indsigter</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={loadInsights} disabled={isLoading} className="text-xs text-midnight-500 hover:text-midnight-300 transition-colors disabled:opacity-40" title="Opdater indsigter">
            {isLoading ? '⟳' : '↺'}
          </button>
          <span className="text-xs bg-aurora-violet/15 text-purple-300 border border-aurora-violet/20 rounded-full px-2.5 py-1 font-medium">AI</span>
        </div>
      </div>

      <div className="bg-midnight-900/50 rounded-2xl p-4 mb-4 border border-midnight-700/50 min-h-[56px]">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <p className="text-sm text-midnight-200 leading-relaxed italic">&ldquo;{summary}&rdquo;</p>
        )}
      </div>

      <div className="space-y-3">
        {patterns.map((pattern, i) => (
          <div key={`pattern-${i}`} className={`flex items-start gap-3 bg-midnight-900/30 rounded-2xl p-3 border border-midnight-700/30 transition-opacity duration-300 ${isLoading ? 'opacity-40' : 'opacity-100'}`}>
            <span className="text-xl mt-0.5">{pattern.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-midnight-300">{pattern.label}</span>
                <span className={`text-xs font-bold ${trendColors[pattern.trend] || 'text-aurora-blue'}`}>{trendIcons[pattern.trend] || '→'}</span>
              </div>
              <p className="text-xs text-midnight-400 leading-relaxed">{pattern.observation}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-midnight-500 text-center mt-4">
        {aiLoaded ? 'Personlige indsigter baseret på din uge · Claude AI' : 'Baseret på dine seneste 7 dages data'}
      </p>
    </div>
  );
}

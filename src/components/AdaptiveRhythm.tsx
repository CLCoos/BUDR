'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';

interface RhythmSuggestion {
  day: string;
  observation: string;
  suggestion: string;
  emoji: string;
}

interface AdaptiveRhythmProps {
  weekMoods?: number[];
  weekEnergy?: number[];
  checkInDays?: boolean[];
}

const dayNames = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

export default function AdaptiveRhythm({
  weekMoods = [6, 5, 7, 4, 6, 8, 7],
  weekEnergy = [3, 2, 4, 2, 3, 4, 4],
  checkInDays = [true, true, true, false, true, true, true],
}: AdaptiveRhythmProps) {
  const [suggestions, setSuggestions] = useState<RhythmSuggestion[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const analyzeRhythm = async () => {
    setLoading(true);
    try {
      const weekData = dayNames.map((day, i) => ({
        day,
        mood: weekMoods[i] ?? 5,
        energy: weekEnergy[i] ?? 3,
        checkedIn: checkInDays[i] ?? false,
      }));

      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'ANTHROPIC',
          model: ANTHROPIC_CHAT_MODEL,
          messages: [
            {
              role: 'system',
              content: `Du er en adaptiv AI-coach der lærer brugerens ugentlige rytme og foreslår rutineændringer. Analyser ugedataen og svar KUN med valid JSON:
{"summary":"personlig opsummering af ugentlig rytme (max 2 sætninger)","suggestions":[{"day":"ugedag","observation":"hvad du ser (max 15 ord)","suggestion":"konkret forslag (max 15 ord)","emoji":"relevant emoji"}]}
Giv max 3 suggestions for de mest markante mønstre. Vær specifik og handlingsorienteret.`,
            },
            {
              role: 'user',
              content: `Brugerens ugentlige data:\n${JSON.stringify(weekData, null, 2)}\n\nAnalyser rytmen og foreslå rutineændringer.`,
            },
          ],
          stream: false,
          parameters: { max_tokens: 400, temperature: 0.7 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && mountedRef.current) {
          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              setSummary(parsed.summary || '');
              setSuggestions(parsed.suggestions || []);
              setLoaded(true);
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* silently fail */
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // Mini mood chart
  const maxMood = Math.max(...weekMoods, 1);

  return (
    <div className="insight-card animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
          style={{
            background:
              'linear-gradient(135deg, rgba(251,146,60,0.3) 0%, rgba(167,139,250,0.2) 100%)',
          }}
        >
          🧠
        </div>
        <div>
          <h3 className="font-display text-base font-bold text-midnight-50">Adaptiv rytme</h3>
          <p className="text-xs text-midnight-400">Claude lærer din ugentlige rytme</p>
        </div>
        <span className="ml-auto text-xs bg-aurora-violet/15 text-purple-300 border border-aurora-violet/20 rounded-full px-2.5 py-1 font-medium">
          AI
        </span>
      </div>

      {/* Mini week chart */}
      <div className="flex items-end gap-1 mb-4 h-12">
        {dayNames.map((day, i) => {
          const mood = weekMoods[i] ?? 5;
          const energy = weekEnergy[i] ?? 3;
          const checkedIn = checkInDays[i] ?? false;
          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full flex flex-col items-center justify-end"
                style={{ height: '36px' }}
              >
                <div
                  className="w-full rounded-t-sm transition-all duration-500"
                  style={{
                    height: `${(mood / maxMood) * 36}px`,
                    background: energy >= 4 ? '#34D399' : energy >= 3 ? '#FB923C' : '#60A5FA',
                    opacity: checkedIn ? 1 : 0.3,
                  }}
                />
              </div>
              <span className="text-xs text-midnight-500">{day}</span>
            </div>
          );
        })}
      </div>

      {!loaded && !loading && (
        <button
          onClick={analyzeRhythm}
          className="w-full flex items-center justify-center gap-2 bg-sunrise-400/10 border border-sunrise-400/20 rounded-2xl px-4 py-3 text-sm text-sunrise-300 font-medium hover:bg-sunrise-400/15 transition-all duration-200"
        >
          <span>🧠</span>
          <span>Analyser min ugentlige rytme</span>
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-2">
          <span
            className="inline-block w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="inline-block w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="inline-block w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
          <span className="text-xs text-midnight-400 ml-1">Claude analyserer din rytme...</span>
        </div>
      )}

      {loaded && (
        <div className="space-y-3 animate-slide-up">
          {summary && (
            <div className="bg-midnight-900/50 rounded-2xl p-3 border border-midnight-700/50">
              <p className="text-xs text-midnight-200 leading-relaxed italic">
                &ldquo;{summary}&rdquo;
              </p>
            </div>
          )}
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-midnight-900/30 rounded-2xl p-3 border border-midnight-700/30"
            >
              <span className="text-xl mt-0.5">{s.emoji}</span>
              <div>
                <p className="text-xs font-semibold text-sunrise-300">{s.day}</p>
                <p className="text-xs text-midnight-400 mt-0.5">{s.observation}</p>
                <p className="text-xs text-midnight-200 mt-1 font-medium">→ {s.suggestion}</p>
              </div>
            </div>
          ))}
          <button
            onClick={analyzeRhythm}
            disabled={loading}
            className="text-xs text-midnight-500 hover:text-midnight-300 transition-colors"
          >
            ↺ Opdater analyse
          </button>
        </div>
      )}
    </div>
  );
}

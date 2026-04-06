'use client';

import React, { useState, useEffect, useRef } from 'react';
import BottomNav from '@/components/BottomNav';
import StatsHeader from './StatsHeader';
import WeeklyMoodChart from './WeeklyMoodChart';
import ResourceTrends from './ResourceTrends';
import GoalHistory from './GoalHistory';
import Lys from '@/components/Lys';
import Mønsterspejlet from '@/components/Mønsterspejlet';
import AdaptiveRhythm from '@/components/AdaptiveRhythm';
import ProactiveNudges from '@/components/ProactiveNudges';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ProfileView() {
  const [activeTab, setActiveTab] = useState<'oversigt' | 'mål' | 'mønstre'>('oversigt');
  const [coachMessage, setCoachMessage] = useState('Godt arbejde denne uge! Du har holdt din streak i 7 dage 🔥');
  const [coachLoading, setCoachLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'mønstre' || t === 'monster' || t === 'monstre') setActiveTab('mønstre');
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCoachLoading(true);
    fetch('/api/ai/chat-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'ANTHROPIC',
        model: ANTHROPIC_CHAT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Du er en varm, personlig life-coach i en dansk mental sundhedsapp. Skriv en kort, personlig ugentlig anerkendelse til brugeren. Max 2 sætninger, max 30 ord. Vær specifik, varm og inspirerende. Afslut med ét emoji.',
          },
          {
            role: 'user',
            content: 'Brugeren har holdt en streak på 7 dage i træk. De har gennemført check-ins, journalindlæg og udfordringer. Giv dem en personlig anerkendelse og opmuntring til at fortsætte.',
          },
        ],
        stream: false,
        parameters: { max_tokens: 80, temperature: 0.8 },
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const text = d?.choices?.[0]?.message?.content;
        if (text && mountedRef.current) setCoachMessage(text.trim());
      })
      .catch(() => { /* keep fallback */ })
      .finally(() => { if (mountedRef.current) setCoachLoading(false); });
  }, []);

  return (
    <div className="min-h-screen gradient-midnight pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-midnight-900/90 backdrop-blur-xl border-b border-midnight-700/50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold text-midnight-50">Profil</h1>
              <p className="text-xs text-midnight-400 mt-0.5">Din fremgang og statistik</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="streak-badge text-xs px-2 py-0.5">🔥 7 dage</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mt-3">
            {([
              { key: 'oversigt', label: '📊 Oversigt' },
              { key: 'mål', label: '🎯 Mål' },
              { key: 'mønstre', label: '🔮 Mønstre' },
            ] as { key: 'oversigt' | 'mål' | 'mønstre'; label: string }[]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[36px] ${
                  activeTab === tab.key
                    ? 'bg-sunrise-400/20 text-sunrise-300 border border-sunrise-400/30' :'bg-midnight-800 text-midnight-400 border border-midnight-700 hover:text-midnight-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Lys companion with AI life-coach message */}
        <div className="flex items-center gap-3 bg-midnight-800/50 rounded-2xl p-4 border border-midnight-700/50">
          <Lys mood="happy" size="sm" userContext="profil, ugentlig fremgang, 7-dages streak" />
          <div className="flex-1 min-w-0">
            {coachLoading ? (
              <div className="flex items-center gap-1.5 py-1">
                <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <>
                <p className="font-display text-sm font-semibold text-midnight-100 leading-snug">{coachMessage}</p>
                <p className="text-xs text-purple-400 mt-1">✨ Din personlige coach</p>
              </>
            )}
          </div>
        </div>

        {/* Navigation shortcuts to new features */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => router.push('/voice-journal')}
            className="flex items-center gap-2 bg-midnight-800/40 rounded-2xl px-3 py-3 border border-midnight-700/40 hover:border-midnight-600/60 transition-all duration-200 min-h-[60px]"
          >
            <span className="text-xl flex-shrink-0">🎙️</span>
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-midnight-200 leading-tight">Stemmejournal</p>
              <p className="text-xs text-midnight-500">Tal med Claude</p>
            </div>
          </button>
          <button
            onClick={() => router.push('/shared-lys')}
            className="flex items-center gap-2 bg-midnight-800/40 rounded-2xl px-3 py-3 border border-midnight-700/40 hover:border-midnight-600/60 transition-all duration-200 min-h-[60px]"
          >
            <span className="text-xl flex-shrink-0">🫂</span>
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-midnight-200 leading-tight">Delt Lys</p>
              <p className="text-xs text-midnight-500">Med støtteperson</p>
            </div>
          </button>
          <button
            onClick={() => router.push('/monthly-report')}
            className="flex items-center gap-2 bg-midnight-800/40 rounded-2xl px-3 py-3 border border-midnight-700/40 hover:border-midnight-600/60 transition-all duration-200 min-h-[60px]"
          >
            <span className="text-xl flex-shrink-0">📊</span>
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-midnight-200 leading-tight">Månedlig rapport</p>
              <p className="text-xs text-midnight-500">PDF til møder</p>
            </div>
          </button>
          <button
            onClick={() => router.push('/staff-dashboard')}
            className="flex items-center gap-2 bg-midnight-800/40 rounded-2xl px-3 py-3 border border-midnight-700/40 hover:border-midnight-600/60 transition-all duration-200 min-h-[60px]"
          >
            <span className="text-xl flex-shrink-0">👁️</span>
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-midnight-200 leading-tight">Personale</p>
              <p className="text-xs text-midnight-500">Live KRAP-feed</p>
            </div>
          </button>
        </div>

        {/* Stille tilstand shortcut */}
        <button
          onClick={() => router.push('/stille')}
          className="w-full flex items-center gap-3 bg-midnight-800/40 rounded-2xl px-4 py-3 border border-midnight-700/40 hover:border-midnight-600/60 transition-all duration-200 active:scale-[0.98] min-h-[52px]"
        >
          <span className="text-xl">🌙</span>
          <div className="text-left">
            <p className="text-sm font-medium text-midnight-200">Stille tilstand</p>
            <p className="text-xs text-midnight-500">Til svære dage — bare Lys og ro</p>
          </div>
          <span className="ml-auto text-midnight-600 text-sm">→</span>
        </button>

        {activeTab === 'oversigt' && (
          <>
            <ProactiveNudges
              recentMoods={[6, 5, 7, 4, 6, 8, 7]}
              lastSleepScore={3}
              daysSinceCheckin={0}
              weekdayPattern="Tirsdage er typisk sværere"
            />
            <StatsHeader />
            <WeeklyMoodChart />
            <ResourceTrends />
          </>
        )}
        {activeTab === 'mål' && <GoalHistory />}
        {activeTab === 'mønstre' && (
          <>
            <AdaptiveRhythm
              weekMoods={[6, 5, 7, 4, 6, 8, 7]}
              weekEnergy={[3, 2, 4, 2, 3, 4, 4]}
              checkInDays={[true, true, true, false, true, true, true]}
            />
            <Mønsterspejlet />
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

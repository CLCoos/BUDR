'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAIInsights } from '@/components/Mønsterspejlet';

const WEEK_MOODS = [6, 5, 7, 4, 6, 8, 7];

function firstSentence(summary: string): string {
  const s = summary.trim();
  const cut = s.split(/(?<=[.!?])\s+/)[0] || s;
  return cut.length > 140 ? `${cut.slice(0, 137)}…` : cut;
}

export default function WeeklyInsightTeaser() {
  const router = useRouter();
  const [line, setLine] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchAIInsights({ weekMoods: WEEK_MOODS });
      if (!cancelled && result?.summary) setLine(firstSentence(result.summary));
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-midnight-700/50 bg-midnight-800/40 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <span className="text-lg flex-shrink-0" aria-hidden>
          🔮
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-midnight-500 uppercase tracking-wide mb-0.5">
            Ugens indsigt
          </p>
          <p className="text-sm text-midnight-200 leading-snug">
            {loading
              ? 'Henter et øjeblik…'
              : line || 'Din uge har mønstre — se dem sammen med Lys under Profil.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => router.push('/profile?tab=mønstre')}
        className="flex-shrink-0 text-sm font-semibold text-sunrise-400 hover:text-sunrise-300 transition-colors px-3 py-2 rounded-xl border border-sunrise-400/25 bg-sunrise-400/5 min-h-[44px] sm:min-h-0"
      >
        Læs mere
      </button>
    </div>
  );
}

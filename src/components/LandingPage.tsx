'use client';

import Link from 'next/link';
import { useCallback, useLayoutEffect, useState } from 'react';
import Lys from '@/components/Lys';
import LaunchSplash from '@/components/LaunchSplash';

const LAUNCH_STORAGE_KEY = 'budr_launch_once';

/**
 * Forside før onboarding: kort præsentation + tydelig CTA.
 * Onboarding starter først når brugeren vælger det.
 * Én gang pr. browserfane: kort animeret opstartsskærm (som i store apps).
 */
export default function LandingPage() {
  const [ready, setReady] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  useLayoutEffect(() => {
    try {
      setShowSplash(!sessionStorage.getItem(LAUNCH_STORAGE_KEY));
    } catch {
      setShowSplash(true);
    }
    setReady(true);
  }, []);

  const onSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (!ready) {
    return <div className="min-h-screen bg-[#0a0a14]" aria-hidden />;
  }

  return (
    <>
      {showSplash ? <LaunchSplash onComplete={onSplashComplete} /> : null}
      <div
        className={`min-h-screen gradient-midnight flex flex-col transition-opacity duration-300 ${
          showSplash ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-hidden={showSplash}
      >
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-lg mx-auto w-full text-center">
          <div className="mb-6 animate-fade-in">
            <Lys mood="calm" size="lg" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-sunrise-400/90 mb-3">
            Mental sundhed · Struktur · Støtte
          </p>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-midnight-50 mb-3 leading-tight">
            <span className="gradient-sunrise-text">BUDR2.0</span>
          </h1>

          <div className="w-full max-w-sm mb-8 text-left rounded-2xl border border-midnight-600/60 bg-midnight-800/50 px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sunrise-400/90 mb-2">
              Et øjeblik med Lys
            </p>
            <p className="text-midnight-200 text-sm sm:text-[15px] leading-relaxed">
              Du vågner og mærker, at dagen føles tung. I stedet for en lang liste møder{' '}
              <strong className="text-midnight-50 font-semibold">Lys</strong> dig med ro: én ting ad
              gangen, tydelige farver og små skridt — så du kan mærke fremgang uden at blive
              overvældet.
            </p>
          </div>

          <ul className="w-full max-w-sm text-left space-y-4 mb-10">
            <li className="flex gap-3 items-start rounded-xl border border-midnight-600/40 bg-midnight-800/30 px-3 py-3">
              <span className="text-xl shrink-0 leading-none mt-0.5" aria-hidden>
                🗓️
              </span>
              <div>
                <p className="font-display font-bold text-midnight-50 text-sm sm:text-base leading-snug">
                  Overblik uden støj
                </p>
                <p className="text-midnight-400 text-xs sm:text-sm mt-1 leading-relaxed">
                  Daglig struktur og energiflod, så du ser hvad der er realistisk i dag.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-lg shrink-0 text-midnight-500" aria-hidden>
                🎯
              </span>
              <div>
                <p className="font-semibold text-midnight-200 text-sm leading-snug">
                  Tilpasset din energi
                </p>
                <p className="text-midnight-500 text-xs mt-0.5 leading-relaxed">
                  Udfordringer og vaner der matcher, hvordan du har det.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-lg shrink-0 text-midnight-500" aria-hidden>
                💜
              </span>
              <div>
                <p className="font-semibold text-midnight-200 text-sm leading-snug">
                  Støtte, når du har brug
                </p>
                <p className="text-midnight-500 text-xs mt-0.5 leading-relaxed">
                  Støttecirkel, Social og stille øjeblikke — uden pres.
                </p>
              </div>
            </li>
          </ul>

          <div className="w-full max-w-xs space-y-3">
            <Link
              href="/onboarding"
              className="block w-full py-3.5 px-6 rounded-2xl font-display font-bold text-midnight-950 bg-gradient-to-r from-sunrise-400 to-sunrise-500 hover:from-sunrise-300 hover:to-sunrise-400 transition-all shadow-lg shadow-sunrise-500/20 active:scale-[0.98]"
            >
              Kom i gang
            </Link>
            <p className="text-xs text-midnight-500">
              Næste skridt tager ca. 2 minutter — du kan springe over senere, hvis du vil udforske
              først.
            </p>
          </div>
        </main>

        <footer className="py-6 text-center text-[11px] text-midnight-600 px-4">
          Struktur og støtte — i dit eget tempo.
        </footer>
      </div>
    </>
  );
}

'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import Ga4Scripts, { isValidGaMeasurementId } from '@/components/Ga4Scripts';
import {
  analyticsConsentBypassed,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from '@/lib/analyticsConsent';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

type ConsentUi = 'loading' | 'pending' | 'granted' | 'denied' | 'inactive';

export default function AnalyticsGate() {
  const [ui, setUi] = useState<ConsentUi>('loading');

  useEffect(() => {
    if (!isValidGaMeasurementId(GA_ID)) {
      setUi('inactive');
      return;
    }
    if (analyticsConsentBypassed()) {
      setUi('granted');
      return;
    }
    const stored = readAnalyticsConsent();
    if (stored === 'granted') setUi('granted');
    else if (stored === 'denied') setUi('denied');
    else setUi('pending');
  }, []);

  const grant = () => {
    writeAnalyticsConsent('granted');
    setUi('granted');
  };

  const deny = () => {
    writeAnalyticsConsent('denied');
    setUi('denied');
  };

  return (
    <>
      {ui === 'granted' && <Ga4Scripts />}

      {ui === 'pending' && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[90] border-t border-white/10 bg-[#0F1B2D]/98 px-4 py-4 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
          role="dialog"
          aria-labelledby="analytics-consent-title"
          aria-live="polite"
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p id="analytics-consent-title" className="text-sm font-semibold text-white">
                Statistik til at forbedre BUDR
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">
                Vi bruger Google Analytics til at se, hvordan siden bruges — uden at kende dig
                personligt. Du vælger selv. Læs mere i vores{' '}
                <Link href="/privacy" className="text-[#1D9E75] underline underline-offset-2">
                  privatlivspolitik
                </Link>
                .
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={deny}
                className="rounded-lg border border-white/15 bg-[#162032] px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5"
              >
                Kun nødvendigt
              </button>
              <button
                type="button"
                onClick={grant}
                className="rounded-lg bg-[#1D9E75] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
              >
                Tillad statistik
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

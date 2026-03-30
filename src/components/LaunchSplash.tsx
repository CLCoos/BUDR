'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import AppLogo from '@/components/ui/AppLogo';

const STORAGE_KEY = 'budr_launch_once';

interface LaunchSplashProps {
  onComplete: () => void;
}

/**
 * Kort “native app”-agtig opstart: ringe, logo-pop, titel — derefter fade ud.
 * Bruges på forsiden; springes over hvis sessionStorage allerede sat (samme fane).
 */
export default function LaunchSplash({ onComplete }: LaunchSplashProps) {
  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* private mode */
      }
    }
    setExiting(true);
    window.setTimeout(onComplete, 520);
  }, [onComplete]);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const delay = reduced ? 350 : 1400;
    const id = window.setTimeout(finish, delay);
    return () => window.clearTimeout(id);
  }, [finish]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#0a0a14] transition-[background] duration-500 ${
        exiting ? 'animate-launch-exit' : ''
      }`}
      role="dialog"
      aria-label="Starter BUDR2.0"
      aria-busy={!exiting}
      onClick={() => !exiting && finish()}
    >
      {/* Soft vignette + gradient */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 42%, rgba(251,146,60,0.18) 0%, transparent 55%), radial-gradient(ellipse 100% 80% at 50% 100%, rgba(167,139,250,0.12) 0%, transparent 45%)',
        }}
      />

      {/* Expanding rings */}
      <div className="absolute flex items-center justify-center pointer-events-none">
        {[0, 0.55, 1.1].map((delay) => (
          <span
            key={delay}
            className="absolute rounded-full border-2 border-sunrise-400/35 animate-launch-ring"
            style={{
              width: 'min(72vw, 320px)',
              height: 'min(72vw, 320px)',
              animationDelay: `${delay}s`,
            }}
            aria-hidden
          />
        ))}
      </div>

      {/* Slow rotating glow behind logo */}
      <div
        className="absolute w-[min(88vw,380px)] h-[min(88vw,380px)] rounded-full opacity-40 blur-3xl animate-launch-glow pointer-events-none"
        style={{
          background: 'conic-gradient(from 0deg, #fb923c33, #a78bfa44, #38bdf833, #fb923c33)',
        }}
        aria-hidden
      />

      {/* Logo + brand — stopPropagation så klik på knap ikke dobbelt-triggrer */}
      <div
        className="relative z-10 flex flex-col items-center px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="animate-launch-logo mb-6 drop-shadow-[0_0_40px_rgba(251,146,60,0.35)]">
          <AppLogo size={96} className="justify-center" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight animate-launch-title">
          <span className="gradient-sunrise-text">BUDR2.0</span>
        </h1>
        <p className="mt-2 text-sm text-midnight-400 animate-launch-sub max-w-[240px] leading-snug">
          Din dag — med ro og struktur
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
          className="mt-6 text-xs font-semibold text-midnight-500 hover:text-sunrise-400 underline underline-offset-2 min-h-[44px] px-4"
        >
          Spring intro over
        </button>
      </div>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-midnight-800/80">
        <div className="h-full w-full origin-left bg-gradient-to-r from-sunrise-500 via-purple-400 to-sunrise-400 scale-x-0 animate-launch-progress" />
      </div>
    </div>
  );
}

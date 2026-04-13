'use client';

/**
 * CSS variable map (fra eksisterende design tokens i projektet):
 * --cp-bg, --cp-bg2, --cp-bg3
 * --cp-border, --cp-border2
 * --cp-text, --cp-muted, --cp-muted2
 * --cp-green, --cp-green-dim
 * --cp-blue, --cp-blue-dim
 * --font-budr-wordmark, --font-landing-body
 */

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';

const SPLASH_SEEN_KEY = 'budr-care-entry-splash-seen';

const HINTS_LEFT = [
  'Daglig aktivitetsstøtte',
  'Pårørendeinformation',
  'Indsigt i forløbet',
] as const;

const HINTS_RIGHT = [
  'Borgeroversigt og journaler',
  'Vagtplanlægning',
  'Intern beskedgivning',
] as const;

export default function CareEntrySplit() {
  const [hovered, setHovered] = useState<'left' | 'right' | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(SPLASH_SEEN_KEY)) {
        setShowSplash(false);
      }
    } catch {
      /* private mode / storage blocked */
    }
  }, []);

  useEffect(() => {
    if (!showSplash) return undefined;
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShowSplash(false);
      return undefined;
    }
    const startFade = window.setTimeout(() => setSplashFading(true), 480);
    const removeSplash = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
      } catch {
        /* ignore */
      }
      setShowSplash(false);
    }, 880);
    return () => {
      window.clearTimeout(startFade);
      window.clearTimeout(removeSplash);
    };
  }, [showSplash]);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  const handleMouseEnter = (side: 'left' | 'right') => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setHovered(side);
  };

  const handleMouseLeave = (side: 'left' | 'right') => {
    hoverTimer.current = setTimeout(() => {
      setHovered((current) => (current === side ? null : current));
    }, 380);
  };

  return (
    <main className="care-entry-root">
      {showSplash && (
        <div className={`care-entry-splash ${splashFading ? 'care-entry-splash-out' : ''}`}>
          <div className="budr-logo-animate">
            <BudrLogo size={140} showWordmark />
          </div>
        </div>
      )}

      <div className="care-entry-panels">
        <section
          className="care-entry-panel care-entry-panel--left"
          onMouseEnter={() => handleMouseEnter('left')}
          onMouseLeave={() => handleMouseLeave('left')}
        >
          <svg
            className="care-entry-panel-grid-svg care-entry-panel-grid-svg--left"
            aria-hidden
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="grid-left" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#2dd4a0" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-left)" />
          </svg>
          <div
            className={`care-entry-panel-shade care-entry-panel-shade--left ${hovered === 'left' ? 'is-visible' : ''}`}
          />
          <div className="budr-panel-content budr-fade-in">
            <BudrLogo size={56} dark showWordmark />
            <h1 className="care-entry-deck-title care-entry-deck-title--on-dark">
              Til borgere og pårørende
            </h1>
            <p className="care-entry-deck-lede care-entry-deck-lede--on-dark">
              Læs om BUDR Lys og hvad vi tilbyder
            </p>
            <a href="/institutioner" className="budr-cta-dark">
              Læs mere →
            </a>
            <div className="budr-feature-hints budr-feature-hints--entry-row">
              {HINTS_LEFT.map((label) => (
                <span
                  key={label}
                  className="budr-feature-hint budr-feature-hint-dark budr-feature-hint--row"
                >
                  <span className="budr-feature-hint-dot" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="budr-divider" aria-hidden>
          <div className="budr-divider-line" />
          <div className="budr-divider-orb">
            <BudrLogo size={22} showWordmark={false} />
          </div>
          <div className="budr-divider-line" />
        </div>

        <section
          className="care-entry-panel care-entry-panel--right"
          onMouseEnter={() => handleMouseEnter('right')}
          onMouseLeave={() => handleMouseLeave('right')}
        >
          <svg
            className="care-entry-panel-grid-svg care-entry-panel-grid-svg--right"
            aria-hidden
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="grid-right" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#0f9b72" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-right)" />
          </svg>
          <div
            className={`care-entry-panel-shade care-entry-panel-shade--right ${hovered === 'right' ? 'is-visible' : ''}`}
          />
          <div className="budr-panel-content budr-fade-in">
            <BudrLogo size={56} showWordmark />
            <h2 className="care-entry-deck-title care-entry-deck-title--on-light">Care Portal</h2>
            <span className="care-entry-accent-rule care-entry-accent-rule--deck" aria-hidden />
            <p className="care-entry-deck-lede care-entry-deck-lede--on-light">
              Til dig der arbejder i socialpsykiatrien
            </p>
            <a href="/care-portal-login" className="budr-cta-green">
              Log ind →
            </a>
            <div className="budr-feature-hints budr-feature-hints--entry-row">
              {HINTS_RIGHT.map((label) => (
                <span
                  key={label}
                  className="budr-feature-hint budr-feature-hint-light budr-feature-hint--row"
                >
                  <span className="budr-feature-hint-dot" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

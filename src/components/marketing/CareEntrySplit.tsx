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

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BudrLogo } from '@/components/brand/BudrLogo';

type HoverSide = 'left' | 'right' | null;

export default function CareEntrySplit() {
  const router = useRouter();
  const [hoverSide, setHoverSide] = useState<HoverSide>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  React.useEffect(() => {
    const startFade = window.setTimeout(() => setSplashFading(true), 1500);
    const removeSplash = window.setTimeout(() => setShowSplash(false), 1950);
    return () => {
      window.clearTimeout(startFade);
      window.clearTimeout(removeSplash);
    };
  }, []);

  const leftFlex = hoverSide === 'left' ? 6 : hoverSide === 'right' ? 4 : 5;
  const rightFlex = hoverSide === 'right' ? 6 : hoverSide === 'left' ? 4 : 5;

  return (
    <main className="care-entry-root">
      {showSplash && (
        <div className={`care-entry-splash ${splashFading ? 'care-entry-splash-out' : ''}`}>
          <div className="budr-logo-animate">
            <BudrLogo size={140} showWordmark />
          </div>
        </div>
      )}

      <div className="care-entry-mobile">
        <section className="care-entry-mobile-top">
          <div className="care-entry-content">
            <BudrLogo size={52} dark showWordmark />
            <h1>Til borgere og pårørende</h1>
            <p>Læs om BUDR Lys og hvad vi tilbyder</p>
            <button type="button" onClick={() => router.push('/institutioner')}>
              Læs mere →
            </button>
          </div>
        </section>
        <section className="care-entry-mobile-bottom">
          <div className="care-entry-content">
            <BudrLogo size={52} showWordmark />
            <h2>Care Portal</h2>
            <span
              style={{
                display: 'block',
                width: '40px',
                height: '2px',
                background: '#2dd4a0',
                marginTop: '-4px',
                marginBottom: '12px',
                borderRadius: '2px',
              }}
            />
            <p>Til dig der arbejder i socialpsykiatrien</p>
            <button type="button" onClick={() => router.push('/care-portal-login')}>
              Log ind →
            </button>
          </div>
        </section>
      </div>

      <div className="care-entry-desktop">
        <section
          className="care-entry-left"
          style={{ flex: leftFlex }}
          onMouseEnter={() => setHoverSide('left')}
          onMouseLeave={() => setHoverSide(null)}
        >
          <div className="care-entry-circle-left" aria-hidden />
          <div className="care-entry-content">
            <BudrLogo size={56} dark showWordmark />
            <h1>Til borgere og pårørende</h1>
            <p>Læs om BUDR Lys og hvad vi tilbyder</p>
            <button type="button" onClick={() => router.push('/institutioner')}>
              Læs mere →
            </button>
          </div>
        </section>

        <section
          className="care-entry-right"
          style={{ flex: rightFlex }}
          onMouseEnter={() => setHoverSide('right')}
          onMouseLeave={() => setHoverSide(null)}
        >
          <div className="care-entry-circle-right" aria-hidden />
          <div className="care-entry-content">
            <BudrLogo size={56} showWordmark />
            <h2>Care Portal</h2>
            <span
              style={{
                display: 'block',
                width: '40px',
                height: '2px',
                background: '#2dd4a0',
                marginTop: '-4px',
                marginBottom: '12px',
                borderRadius: '2px',
              }}
            />
            <p>Til dig der arbejder i socialpsykiatrien</p>
            <button type="button" onClick={() => router.push('/care-portal-login')}>
              Log ind →
            </button>
          </div>
        </section>

        <div className="care-entry-divider" aria-hidden>
          <span
            className={`care-entry-divider-logo ${
              hoverSide === 'left' ? 'care-entry-divider-logo-rotated' : ''
            }`}
          >
            <BudrLogo size={28} showWordmark={false} />
          </span>
        </div>
      </div>
    </main>
  );
}

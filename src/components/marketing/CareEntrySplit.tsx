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
import { BudrLogo } from '@/components/brand/BudrLogo';

type HoverSide = 'left' | 'right' | null;

export default function CareEntrySplit() {
  const [hovered, setHovered] = useState<HoverSide>(null);
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

  const leftFlex = hovered === 'left' ? '1.18' : hovered === 'right' ? '0.82' : '1';
  const rightFlex = hovered === 'right' ? '1.18' : hovered === 'left' ? '0.82' : '1';

  return (
    <main className="care-entry-root">
      {showSplash && (
        <div className={`care-entry-splash ${splashFading ? 'care-entry-splash-out' : ''}`}>
          <div className="budr-logo-animate">
            <BudrLogo size={140} showWordmark />
          </div>
        </div>
      )}

      {/* ── Mobile layout ── */}
      <div className="care-entry-mobile">
        <section className="care-entry-mobile-top">
          <div className="care-entry-content">
            <BudrLogo size={52} dark showWordmark />
            <h1>Til borgere og pårørende</h1>
            <p>Læs om BUDR Lys og hvad vi tilbyder</p>
            <a href="/lys" className="budr-cta-dark">
              Læs mere →
            </a>
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
            <a href="/care-portal-login" className="budr-cta-green">
              Log ind →
            </a>
          </div>
        </section>
      </div>

      {/* ── Desktop layout ── */}
      <div className="care-entry-desktop">
        {/* Left panel */}
        <section
          className="care-entry-left budr-panel-left"
          style={{ flex: leftFlex }}
          onMouseEnter={() => setHovered('left')}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="budr-panel-content budr-fade-in">
            <BudrLogo size={56} dark showWordmark />
            <h1
              style={{
                fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '8px',
                lineHeight: 1.2,
              }}
            >
              Til borgere og pårørende
            </h1>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.5)',
                marginBottom: '28px',
              }}
            >
              Læs om BUDR Lys og hvad vi tilbyder
            </p>
            <a href="/lys" className="budr-cta-dark">
              Læs mere →
            </a>
            <div
              className="budr-feature-hints"
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '16px',
                marginTop: '20px',
                flexWrap: 'wrap',
              }}
            >
              <span
                className="budr-feature-hint budr-feature-hint-dark"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <span className="budr-feature-hint-dot" />
                Daglig aktivitetsstøtte
              </span>
              <span
                className="budr-feature-hint budr-feature-hint-dark"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <span className="budr-feature-hint-dot" />
                Pårørendeinformation
              </span>
              <span
                className="budr-feature-hint budr-feature-hint-dark"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <span className="budr-feature-hint-dot" />
                Indsigt i forløbet
              </span>
            </div>
          </div>
        </section>

        {/* Right panel */}
        <section
          className="care-entry-right budr-panel-right"
          style={{ flex: rightFlex }}
          onMouseEnter={() => setHovered('right')}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="budr-panel-content budr-fade-in">
            <BudrLogo size={56} showWordmark />
            <h2
              style={{
                fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                fontWeight: 700,
                color: '#0f1117',
                marginBottom: '8px',
              }}
            >
              Care Portal
            </h2>
            <span
              style={{
                display: 'block',
                width: '40px',
                height: '2px',
                background: '#2dd4a0',
                marginBottom: '12px',
                borderRadius: '2px',
              }}
            />
            <p
              style={{
                fontSize: '0.9rem',
                color: 'rgba(15,17,23,0.45)',
                marginBottom: '28px',
              }}
            >
              Til dig der arbejder i socialpsykiatrien
            </p>
            <a href="/care-portal-login" className="budr-cta-green">
              Log ind →
            </a>
            <div
              className="budr-feature-hints"
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '16px',
                marginTop: '20px',
                flexWrap: 'wrap',
              }}
            >
              <span
                className="budr-feature-hint budr-feature-hint-light"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <span className="budr-feature-hint-dot" />
                Borgeroversigt og journaler
              </span>
              <span
                className="budr-feature-hint budr-feature-hint-light"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <span className="budr-feature-hint-dot" />
                Vagtplanlægning
              </span>
              <span
                className="budr-feature-hint budr-feature-hint-light"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <span className="budr-feature-hint-dot" />
                Intern beskedgivning
              </span>
            </div>
          </div>
        </section>

        {/* Divider orb */}
        <div className="budr-divider" aria-hidden>
          <div className="budr-divider-line" />
          <div
            className={`budr-divider-orb${hovered === 'left' ? ' budr-divider-orb-rotated' : ''}`}
          >
            <BudrLogo size={28} showWordmark={false} />
          </div>
        </div>
      </div>
    </main>
  );
}

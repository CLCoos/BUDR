'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { useBudrLandingFadeIn } from '@/components/marketing/useBudrLandingFadeIn';

const DayInLifeDemo = dynamic(
  () =>
    import('@/components/marketing/DayInLifeDemo').then((m) => ({
      default: m.DayInLifeDemo,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="live-demo-skeleton" role="status" aria-label="Indlæser interaktiv demo" />
    ),
  }
);

type HomeLandingPageProps = {
  className?: string;
};

export default function HomeLandingPage({ className = '' }: HomeLandingPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useBudrLandingFadeIn(rootRef);

  return (
    <div ref={rootRef} className={`budr-landing ${className}`.trim()}>
      <div className="budr-landing-content home-v2">
        <nav className="home-nav">
          <div className="shell home-nav-inner">
            <a href="#top" className="home-nav-logo">
              <BudrLogo dark size={36} />
            </a>
            <div className="home-nav-links">
              <a href="#se-det-i-aktion">Se det i aktion</a>
              <a href="#kontakt">Kontakt</a>
            </div>
            <div className="home-nav-cta">
              <Link href="/institutioner#kontakt" className="btn-sm">
                Book gratis demo
              </Link>
            </div>
          </div>
        </nav>

        <section className="home-hero fi" id="top">
          <div className="shell home-hero-grid">
            <div className="home-brand-row">
              <BudrLogo dark size={42} />
            </div>
            <h1>Vagtoverdragelsen sker stadig på hukommelse. Det kan løses.</h1>
            <p>
              BUDR Care samler journal, vagtoverdragelse og borger-check-ins i ét system. Personalet
              arbejder på fælles grundlag. Ledelsen har realtidsoverblik. Borgeren er med i flowet.
            </p>
            <div className="hero-actions">
              <a href="/institutioner#kontakt" className="btn-primary">
                Book gratis demo
              </a>
              <Link href="/care-portal-demo" className="btn-ghost">
                Prøv demo
              </Link>
            </div>
          </div>
        </section>

        <section className="home-usp fi" id="scenarier">
          <div className="shell home-copy-shell">
            <h2 className="section-h">Tre situationer I kender alt for godt</h2>
            <div className="home-problem-grid">
              <article className="home-problem-item">
                <p className="home-card-label">Kl. 06:00 · Vagtskifte</p>
                <h3>Overlevering på hukommelse</h3>
                <p>
                  Nattevagten fortæller. Dagvagten noterer hvad den kan huske. Halvdelen er væk
                  inden den første borger er oppe. Næste kollega starter bagud.
                </p>
              </article>
              <article className="home-problem-item">
                <p className="home-card-label">Kl. 14:30 · Dokumentation</p>
                <h3>Journalen venter til sidst på dagen</h3>
                <p>
                  Notaten er ikke godkendt. Lederen kan ikke se hvad der er sket. Teamet tvivler på
                  hvad der er fakta, og hvad der er en kladde fra i torsdags.
                </p>
              </article>
              <article className="home-problem-item">
                <p className="home-card-label">Kl. 16:00 · Borgersignal</p>
                <h3>Borgeren signalerede — ingen så det</h3>
                <p>
                  Check-in&apos;et stod i et system. Teamet arbejdede i et andet. Signalet nåede
                  aldrig frem til den vagt, der kunne handle på det.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="home-demo fi" id="se-det-i-aktion">
          <div className="shell">
            <p className="eyebrow">Se det i aktion</p>
            <h2 className="section-h">Når dagen kører, skal overblikket følge med.</h2>
            <p className="section-p">
              En konkret fortælling fra en pædagogs dag — med tydelig forskel på før og med BUDR.
            </p>
            <DayInLifeDemo />
          </div>
        </section>

        <section className="home-cta-simple fi" id="kontakt">
          <div className="shell">
            <div className="home-cta-simple-inner">
              <h2>Klar til at se BUDR i drift?</h2>
              <Link href="/institutioner#kontakt" className="btn-primary">
                Book gratis demo
              </Link>
            </div>
          </div>
        </section>
        <MarketingFooter />
      </div>
    </div>
  );
}

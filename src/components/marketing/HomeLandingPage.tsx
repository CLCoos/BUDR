'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import { useBudrLandingFadeIn } from '@/components/marketing/useBudrLandingFadeIn';

type HomeLandingPageProps = {
  className?: string;
};

export default function HomeLandingPage({ className = '' }: HomeLandingPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useBudrLandingFadeIn(rootRef);

  return (
    <div ref={rootRef} className={`budr-landing ${className}`.trim()}>
      <div className="budr-landing-content home-v2">
        <section className="home-hero fi" id="top">
          <div className="shell">
            <div className="home-brand-row">
              <BudrLogo dark size={42} />
            </div>
            <h1>Socialpsykiatriens nye standard for drift og dokumentation.</h1>
            <p>
              BUDR Care samler Care Portal til personalet og Lys til borgeren i ét system.
              Information bevæger sig direkte fra hverdagen til handling.
            </p>
            <a href="/institutioner" className="btn-primary">
              Book en gennemgang
            </a>
          </div>
        </section>

        <section className="home-proof fi">
          <div className="shell">
            <p>I pilotdialog med udvalgte botilbud · Dansk hosting-aftale · EU-data efter aftale</p>
          </div>
        </section>

        <section className="home-problem fi">
          <div className="shell home-copy-shell">
            <h2 className="section-h">Branchen har accepteret for meget for længe</h2>
            <p className="section-p">
              Status overleveres mundtligt. Journaler står åbne for længe. Borgerens stemme når
              sjældent helt ind i beslutningen.
            </p>
          </div>
        </section>

        <section className="home-solution fi">
          <div className="shell home-copy-shell">
            <h2 className="section-h">Care Portal og Lys arbejder som ét system</h2>
            <p className="section-p">
              Personale dokumenterer, prioriterer og overdrager i Care Portal. Borgeren check-er ind
              og følger plan i Lys. PARK-metodikken binder den faglige indsats sammen.
            </p>
          </div>
        </section>

        <section className="home-cta-band fi">
          <div className="shell">
            <Link href="/institutioner" className="btn-primary">
              Se hvad vi erstatter →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import { useBudrLandingFadeIn } from '@/components/marketing/useBudrLandingFadeIn';

type HomeLandingPageProps = {
  className?: string;
};

export default function HomeLandingPage({ className = '' }: HomeLandingPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<'care' | 'lys'>('care');
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
              <a href="#problem">Problemet</a>
              <a href="#overblik">Overblik</a>
              <a href="#funktioner">Funktioner</a>
              <a href="#kontakt">Kontakt</a>
            </div>
            <Link href="/institutioner" className="btn-sm">
              Se hvad vi erstatter
            </Link>
          </div>
        </nav>

        <section className="home-hero fi" id="top">
          <div className="shell home-hero-grid">
            <div className="home-brand-row">
              <BudrLogo dark size={42} />
            </div>
            <h1>Socialpsykiatriens nye standard for drift og dokumentation.</h1>
            <p>
              BUDR Care er platformen til botilbud, der vil arbejde hurtigere og mere præcist. Care
              Portal og Lys binder borger og personale sammen i samme beslutningsflow.
            </p>
            <div className="hero-actions">
              <a href="/institutioner" className="btn-primary">
                Book en gennemgang
              </a>
              <Link href="/care-portal-demo" className="btn-ghost">
                Prøv demo
              </Link>
            </div>
            <div className="home-hero-points">
              <span>Én platform til borger og personale</span>
              <span>PARK integreret i daglig drift</span>
              <span>Pilot med målbar effekt</span>
            </div>
          </div>
          <div className="shell home-overview-cards fi fi-d1" id="overblik">
            <article className="home-overview-card">
              <p className="home-card-label">Drift lige nu</p>
              <h3>Hvad teamet ser i Care Portal</h3>
              <ul>
                <li>Godkendt journal før næste vagt</li>
                <li>AI-udkast i faglig kontekst</li>
                <li>Dagens planer og risici samlet</li>
              </ul>
            </article>
            <article className="home-overview-card">
              <p className="home-card-label">Borger i centrum</p>
              <h3>Hvad borgeren ejer i Lys</h3>
              <ul>
                <li>Dagligt check-in med signalværdi</li>
                <li>Egen plan med næste handling</li>
                <li>Krisekort klar i pressede situationer</li>
              </ul>
            </article>
            <article className="home-overview-card">
              <p className="home-card-label">Effekt</p>
              <h3>Hvad ledelsen får</h3>
              <ul>
                <li>Ens praksis på tværs af teams</li>
                <li>Mindre tab af viden i overdragelser</li>
                <li>Hurtig opfølgning på kvalitet</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="home-proof fi">
          <div className="shell">
            <p>I pilotdialog med udvalgte botilbud · Dansk hosting-aftale · EU-data efter aftale</p>
          </div>
        </section>

        <section className="home-usp fi">
          <div className="shell">
            <h2 className="section-h">Det gør os tydeligt anderledes</h2>
            <ul className="home-usp-list">
              <li>Borger-ejet app direkte koblet til personalets arbejdsflow.</li>
              <li>PARK-metodikken er indbygget i funktionerne, ikke i en manual.</li>
              <li>I starter i pilot og skalerer på dokumenteret effekt.</li>
            </ul>
          </div>
        </section>

        <section className="home-problem fi" id="problem">
          <div className="shell home-copy-shell">
            <h2 className="section-h">Branchen har accepteret for meget for længe</h2>
            <p className="section-p">
              Status overleveres mundtligt. Journaler står åbne for længe. Borgerens stemme når
              sjældent helt ind i beslutningen.
            </p>
            <div className="home-problem-grid">
              <div className="home-problem-item">Overlevering bygger på hukommelse.</div>
              <div className="home-problem-item">Kladder bliver forvekslet med dokumentation.</div>
              <div className="home-problem-item">Borgerdata lever uden for medarbejderflowet.</div>
            </div>
          </div>
        </section>

        <section className="home-solution fi" id="funktioner">
          <div className="shell home-copy-shell">
            <h2 className="section-h">Care Portal og Lys arbejder som ét system</h2>
            <p className="section-p">
              Personale dokumenterer, prioriterer og overdrager i Care Portal. Borgeren check-er ind
              og følger plan i Lys. PARK-metodikken binder den faglige indsats sammen.
            </p>
            <div className="home-view-switch">
              <button
                type="button"
                className={activeView === 'care' ? 'is-active' : undefined}
                onClick={() => setActiveView('care')}
              >
                Care Portal
              </button>
              <button
                type="button"
                className={activeView === 'lys' ? 'is-active' : undefined}
                onClick={() => setActiveView('lys')}
              >
                Lys app
              </button>
            </div>
            {activeView === 'care' ? (
              <div className="home-feature-box fi">
                <h3>Fagligt cockpit til teamet</h3>
                <ul>
                  <li>Journal med kladde og godkendt status</li>
                  <li>Vagtoverdragelse med fælles sandhed</li>
                  <li>AI-assistent til hurtige faglige udkast</li>
                </ul>
              </div>
            ) : (
              <div className="home-feature-box fi">
                <h3>Borgerens egen app, ikke en passiv portal</h3>
                <ul>
                  <li>Daglige check-ins lander direkte hos teamet</li>
                  <li>Plan og kriseoverblik i borgerens tempo</li>
                  <li>Signaler omsættes til handling samme dag</li>
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="home-cta-band fi" id="kontakt">
          <div className="shell">
            <div className="home-cta-band-inner">
              <h2>Se præcis hvad vi erstatter i jeres drift</h2>
              <div className="hero-actions">
                <Link href="/institutioner" className="btn-primary">
                  Se hvad vi erstatter →
                </Link>
                <Link href="/care-portal-demo" className="btn-ghost">
                  Prøv demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

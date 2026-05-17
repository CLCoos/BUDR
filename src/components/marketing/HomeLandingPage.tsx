'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { useBudrLandingFadeIn } from '@/components/marketing/useBudrLandingFadeIn';

const LandingInteractiveDemo = dynamic(
  () =>
    import('@/components/marketing/LandingInteractiveDemo').then((m) => ({
      default: m.LandingInteractiveDemo,
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

const CARE_USPS = [
  'Realtime risikobillede på tværs af alle borgere.',
  'Fra observation til godkendt journal i samme flow.',
  'AI-støttet dagssyntese til skarp overdragelse.',
  'Beboer-360 med plan- og medicinhandlinger samlet.',
  'Ledelsesklare rapporter direkte fra driftsdata.',
] as const;

const LYS_USPS = [
  'Akut-beredskab i app med direkte personalealarm.',
  'Tidlig opsporing via humørtjek med handling i portalen.',
  'Samskabt dagsstruktur mellem borger og personale.',
  'AI-støttet journal med PARK-kladde på sekunder.',
  'Empatisk Lys-ledsager med kontinuitet mellem vagter.',
] as const;

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
              <a href="#live-demo">Se det i aktion</a>
              <a href="#funktioner">Funktioner</a>
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
            <p>Dansk platform · Bygget til socialpsykiatri · GDPR-klar hosting</p>
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

        <section className="home-usp fi">
          <div className="shell">
            <h2 className="section-h">Det gør os tydeligt anderledes</h2>
            <div className="home-usp-grid">
              <article className="home-usp-card">
                <p className="home-card-label">Borger i centrum</p>
                <h3>Borger og personale i samme flow</h3>
                <p>Borger-ejet app koblet direkte til teamets daglige arbejde.</p>
              </article>
              <article className="home-usp-card">
                <p className="home-card-label">Metode</p>
                <h3>PARK indbygget i produktet</h3>
                <p>Metodikken lever i funktionerne. Ikke i et separat dokument.</p>
              </article>
              <article className="home-usp-card">
                <p className="home-card-label">Implementering</p>
                <h3>Pilot før skalering</h3>
                <p>I starter med målbar effekt og udvider på dokumenteret kvalitet.</p>
              </article>
            </div>
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
              <article className="home-problem-item">
                <h3>Overlevering på hukommelse</h3>
                <p>Næste vagt mangler afgørende kontekst fra starten.</p>
              </article>
              <article className="home-problem-item">
                <h3>Kladder forveksles med fakta</h3>
                <p>Teamet tvivler på, hvad der er godkendt dokumentation.</p>
              </article>
              <article className="home-problem-item">
                <h3>Borgerdata ligger ved siden af drift</h3>
                <p>Signaler når for sent frem til dem, der skal handle.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="home-demo fi" id="live-demo">
          <div className="shell">
            <p className="eyebrow">Se det i aktion</p>
            <h2 className="section-h">Borgeren check-er ind. Teamet ser det med det samme.</h2>
            <p className="section-p">
              Vælg humør, energi og hvad der fylder — og se præcis hvad der lander i Care Portal.
              Det her er ikke en animation. Det er den rigtige logik.
            </p>
            <LandingInteractiveDemo />
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

        <section className="home-top-usp fi" id="usp-top5">
          <div className="shell">
            <h2 className="section-h">Det mest værdiskabende i platformen</h2>
            <p className="section-p">
              Prioriteret efter driftseffekt for ledelse, medarbejdere og borgere.
            </p>
            <div className="home-top-usp-grid">
              <article className="home-top-usp-panel">
                <p className="home-card-label">Care Portal · Top 5</p>
                <ol>
                  {CARE_USPS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </article>
              <article className="home-top-usp-panel">
                <p className="home-card-label">Lys app · Top 5</p>
                <ol>
                  {LYS_USPS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </article>
            </div>
          </div>
        </section>

        <section className="home-story fi">
          <div className="shell home-story-grid">
            <div className="home-story-steps">
              <article className="home-story-step fi fi-d1">
                <p className="home-card-label">1 · Borger signalerer</p>
                <h3>Check-in lander med det samme</h3>
                <p>Status, behov og noter går direkte ind i teamets overblik.</p>
              </article>
              <article className="home-story-step fi fi-d2">
                <p className="home-card-label">2 · Team handler</p>
                <h3>Vagt tager beslutning på fælles grundlag</h3>
                <p>Plan, journal og advarsler ligger samlet i samme skærmbillede.</p>
              </article>
              <article className="home-story-step fi fi-d3">
                <p className="home-card-label">3 · Ledelse følger op</p>
                <h3>Kvalitet bliver synlig og målbar</h3>
                <p>Godkendelsesstatus og driftstal kan følges uden manuel sammenstilling.</p>
              </article>
            </div>
            <aside className="home-story-panel fi">
              <p className="home-card-label">Live flow</p>
              <h3>BUDR Care i praksis</h3>
              <ul>
                <li>
                  <strong>08:12</strong> Borger checker ind i Lys
                </li>
                <li>
                  <strong>08:15</strong> Care Portal opdaterer teamets overblik
                </li>
                <li>
                  <strong>08:24</strong> Vagt justerer plan og notat
                </li>
                <li>
                  <strong>14:55</strong> Godkendt journal klar til næste vagt
                </li>
              </ul>
            </aside>
          </div>
        </section>

        <section className="home-cta-band fi" id="kontakt">
          <div className="shell">
            <div className="home-cta-band-inner">
              <h2>Klar til at se systemet i jeres virkelighed?</h2>
              <div className="hero-actions">
                <Link href="/institutioner#kontakt" className="btn-primary">
                  Book gratis demo →
                </Link>
                <Link href="/care-portal-demo" className="btn-ghost">
                  Prøv demo selv
                </Link>
              </div>
            </div>
          </div>
        </section>
        <MarketingFooter />
      </div>
    </div>
  );
}

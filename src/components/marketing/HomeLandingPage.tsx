'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import { BOOKING_URL, CONTACT_URL } from '@/components/marketing/constants';
import { IconDocMemory, IconMoodSignal, IconShiftGap } from '@/components/marketing/LandingIcons';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { useBudrLandingFadeIn } from '@/components/marketing/useBudrLandingFadeIn';

const DayInLifeDemo = dynamic(
  () =>
    import('@/components/marketing/DayInLifeDemo').then((m) => ({
      default: m.DayInLifeDemo,
    })),
  {
    loading: () => (
      <div className="live-demo-skeleton" role="status" aria-label="Indlæser Saras forløb" />
    ),
  }
);

type HomeLandingPageProps = {
  className?: string;
};

const CHIME_DIMENSIONS = [
  {
    en: 'Connectedness',
    da: 'Forbundethed',
    body: 'Relationer, fællesskab, ikke-isolation. BUDR fanger små sociale skridt — som Saras «smile og sige hej til Sofie» — og gør dem synlige over tid.',
  },
  {
    en: 'Hope',
    da: 'Håb',
    body: 'Recovery-fortællinger fra borgeren selv. Små sejre der ellers ville forsvinde, bliver gemt og kan genbesøges på svære dage.',
  },
  {
    en: 'Identity',
    da: 'Identitet',
    body: 'Borgerprofiler der bygger på styrker, værdier, drømme — ikke kun diagnoser. Personalet møder mennesket, ikke journalen.',
  },
  {
    en: 'Meaning',
    da: 'Mening',
    body: 'Refleksioner over hverdagen. Hvad gav mening i dag? Hvor sad det fast? Borgeren skriver eller taler ind i Lys — personalet ser mønstret.',
  },
  {
    en: 'Empowerment',
    da: 'Handlekraft',
    body: 'Næste skridt formuleres af borgeren, støttet af personalet. Ikke mål sat for borgeren — mål sat med borgeren.',
  },
] as const;

export default function HomeLandingPage({ className = '' }: HomeLandingPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useBudrLandingFadeIn(rootRef);

  return (
    <div ref={rootRef} className={`budr-landing ${className}`.trim()}>
      <div className="budr-landing-content home-v2">
        <nav className="home-nav" aria-label="Primær navigation">
          <div className="shell home-nav-inner">
            <a href="#top" className="home-nav-logo">
              <BudrLogo dark size={36} />
            </a>
            <div className="home-nav-links">
              <a href="#recovery">Recovery</a>
              <a href="#sara-forloeb">Saras forløb</a>
              <a href={CONTACT_URL}>Kontakt</a>
            </div>
            <div className="home-nav-cta">
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-sm">
                Book pilot-samtale
              </a>
            </div>
          </div>
        </nav>

        <main>
          <section className="home-hero fi" id="top">
            <div className="shell home-hero-grid">
              <div className="home-brand-row">
                <BudrLogo dark size={42} />
              </div>
              <p className="eyebrow">Recovery-system til socialpsykiatriske bosteder</p>
              <h1>Vagtoverdragelsen sker stadig på hukommelse. Borgerens recovery på papir.</h1>
              <p>
                BUDR er det første danske system der binder vagtoverdragelse, dokumentation og
                borgerens egen recovery sammen — bygget på CHIME-rammeværket.
              </p>
              <div className="hero-actions">
                <a
                  href={BOOKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Book pilot-samtale
                </a>
                <a href="#sara-forloeb" className="btn-ghost">
                  Se Saras recovery-forløb ↓
                </a>
              </div>
              <ul className="home-trust-strip" aria-label="Tillid og compliance">
                <li>Dansk hosting</li>
                <li>GDPR</li>
                <li>Evidensbaseret (CHIME)</li>
                <li>Bygget af fagperson fra branchen</li>
              </ul>
            </div>
          </section>

          <section className="home-problem fi" id="problem">
            <div className="shell home-copy-shell">
              <h2 className="section-h">Den usynlige overlevering</h2>
              <p className="section-p">
                På et travlt bosted bliver vigtige observationer overleveret som «Sara har det
                dårligt i dag». Resten ligger i nattevagtens hukommelse — eller forsvinder helt.
              </p>
              <p className="section-p">
                Borgerens egen stemme i forløbet er endnu sjældnere. Refleksioner, små sejre,
                mønstre over uger — det er ofte usynligt for personalet, og næsten altid usynligt
                for borgeren selv.
              </p>
              <p className="section-p">
                Det er ikke personalets fejl. Det er værktøjet der mangler.
              </p>
              <ul className="home-pain-list">
                <li>
                  <span className="home-pain-icon" aria-hidden>
                    <IconShiftGap size={22} />
                  </span>
                  <div>
                    <strong>Overlevering på hukommelse</strong>
                    <p>Det vagten ved, forsvinder ved skiftet.</p>
                  </div>
                </li>
                <li>
                  <span className="home-pain-icon" aria-hidden>
                    <IconDocMemory size={22} />
                  </span>
                  <div>
                    <strong>Dokumentation uden retning</strong>
                    <p>Journaler fyldes, men recovery-billedet bliver aldrig hel.</p>
                  </div>
                </li>
                <li>
                  <span className="home-pain-icon" aria-hidden>
                    <IconMoodSignal size={22} />
                  </span>
                  <div>
                    <strong>Borgeren som modtager</strong>
                    <p>Borgeren har ingen plads i sit eget forløb.</p>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section className="home-chime fi" id="recovery">
            <div className="shell home-copy-shell">
              <h2 className="section-h">Recovery, gjort konkret</h2>
              <p className="section-p">
                BUDR bygger på CHIME — det internationalt anerkendte rammeværk for personlig
                recovery (Leamy et al., British Journal of Psychiatry, 2011). Fem dimensioner som
                personale og borger arbejder med sammen, ikke ovenpå hinanden.
              </p>
              <ul className="home-chime-grid">
                {CHIME_DIMENSIONS.map((dim) => (
                  <li key={dim.en} className="home-chime-card">
                    <p className="home-chime-label">
                      {dim.en} — {dim.da}
                    </p>
                    <p>{dim.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="home-sara fi" id="sara-forloeb" aria-labelledby="sara-forloeb-title">
            <div className="shell home-copy-shell">
              <h2 className="section-h" id="sara-forloeb-title">
                Møde Sara, ikke bare hendes journal
              </h2>
              <DayInLifeDemo />
            </div>
          </section>

          <section className="home-credibility fi">
            <div className="shell">
              <p className="home-credibility-line">
                Bygget i Danmark af folk der selv arbejder på socialpsykiatriske bosteder.
              </p>
            </div>
          </section>

          <section className="home-cta-simple fi" id="kontakt">
            <div className="shell">
              <div className="home-cta-simple-inner">
                <h2>Klar til at se BUDR i drift?</h2>
                <Link href={CONTACT_URL} className="btn-primary">
                  Book gratis demo
                </Link>
              </div>
            </div>
          </section>
        </main>
        <MarketingFooter />
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import MarketingContactForm from '@/components/marketing/MarketingContactForm';
import { useBudrLandingFadeIn } from '@/components/marketing/useBudrLandingFadeIn';

type InstitutionerPageProps = {
  className?: string;
};

export default function InstitutionerPage({ className = '' }: InstitutionerPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useBudrLandingFadeIn(rootRef);

  return (
    <div ref={rootRef} className={`budr-landing ${className}`.trim()}>
      <div className="budr-landing-content institutioner-v2">
        <section className="institutioner-hero fi" id="inst-overblik">
          <div className="shell">
            <div className="institutioner-brand-row">
              <Link href="/" className="nav-logo" aria-label="BUDR Care — forsiden">
                <BudrLogo dark size={40} />
              </Link>
              <Link href="/" className="institutioner-back-link">
                Forside
              </Link>
            </div>
            <p className="eyebrow">Til kommuner og botilbud</p>
            <h1 className="section-h">
              Det dokumentationssystem socialpsykiatrien fortjente. Ikke det den fik i 2008.
            </h1>
            <p className="section-p">
              BUDR Care samler Care Portal og Lys i ét driftssystem. Personale arbejder i realtid.
              Borgeren er med i samme flow. Det løfter faglighed, overdragelse og dokumentation fra
              første uge.
            </p>
            <div className="hero-actions">
              <a href="#kontakt" className="btn-primary">
                Book en gennemgang
              </a>
              <Link href="/care-portal-demo" className="btn-ghost">
                Prøv demo
              </Link>
            </div>
          </div>
        </section>

        <section className="institutioner-problem fi" id="problem">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Status quo koster hver vagt</h2>
            <p className="section-p">
              Overleveringer sker mundtligt, fordi systemet ikke hjælper. Viden forsvinder i
              vagtskiftet. Næste kollega starter bagud.
            </p>
            <p className="section-p">
              Journalnotater bliver stående som halvfærdige kladder. Ledelsen mangler et klart
              billede. Teamet tvivler på, hvad der er godkendt.
            </p>
            <p className="section-p">
              Borgeren bliver målt, men sjældent hørt. Beslutninger træffes på afstand fra
              hverdagen. Det svækker relationen og kvaliteten i indsatsen.
            </p>
          </div>
        </section>

        <section className="institutioner-solution fi" id="loesning">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Ét system. To produkter. Samme virkelighed.</h2>
            <p className="section-p">
              Care Portal er personalets cockpit til journal, overblik, AI-assistent og
              vagtoverdragelse. Lys er borgerens egen app til check-in, daglige planer og
              kriseoverblik.
            </p>
            <p className="section-p">
              Når borgeren registrerer i Lys, handler personalet i Care Portal. PARK-metodikken er
              indbygget som faglig rygrad i hele flowet.
            </p>
          </div>
        </section>

        <section className="institutioner-contrast fi" id="differentiering">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Vi bygger til den drift I står i</h2>
            <p className="section-p">
              Mens andre binder jer i lange kontrakter på software fra en anden tid, leverer vi en
              platform bygget til socialpsykiatrisk hverdagsdrift. I ejer data. I ejer tempoet.
            </p>
            <p className="section-p">
              I starter med en pilot med målbare succeskriterier. Når kvaliteten stiger, udvider I.
              Ikke omvendt.
            </p>
          </div>
        </section>

        <section className="institutioner-social-proof fi" id="social-proof">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Social proof</h2>
            <p className="section-p">
              Vi er i pilotdialog med udvalgte botilbud. Kontakt os for at høre mere.
            </p>
          </div>
        </section>

        <section className="institutioner-target fi" id="maalgruppe">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Målgruppe</h2>
            <ul className="intro-detail-list">
              <li>Forstandere og ledere, der vil løfte faglig kvalitet og dokumentation.</li>
              <li>Kommunale tilbudskonsulenter og socialchefer med ansvar for drift.</li>
              <li>Faglige teams, der vil have samme overblik på tværs af vagter.</li>
            </ul>
          </div>
        </section>

        <section className="institutioner-implementation fi" id="implementering">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Implementering</h2>
            <ul className="intro-detail-list">
              <li>Vi planlægger forløbet med jeres ledelse og nøglepersoner.</li>
              <li>Vi håndterer opsætning, onboarding og træning af medarbejdere.</li>
              <li>Vi følger driftstæt op i opstartsperioden med faste checkpoints.</li>
              <li>Vi dokumenterer effekt, så I kan beslutte næste skridt hurtigt.</li>
            </ul>
          </div>
        </section>

        <section className="institutioner-pilot fi" id="pilot">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Pilot</h2>
            <p className="section-p">
              Piloten afklarer drift, adfærd og effekt i praksis. Format og succeskriterier får I i
              pilotpakken efter første møde.
            </p>
          </div>
        </section>

        <section className="institutioner-tech fi" id="teknik">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Til IT og DPO</h2>
            <p className="section-p">
              Teknisk dokumentation og underdatabehandlerliste leveres til jeres IT og DPO på
              forespørgsel. <a href="#kontakt">Kontakt os →</a>
            </p>
          </div>
        </section>

        <section className="cta-section institutioner-contact" id="kontakt">
          <div className="cta-bg" aria-hidden />
          <div className="shell fi institutioner-contact-inner">
            <h2>Klar til at erstatte systemet, I har accepteret for længe?</h2>
            <p className="cta-lead">
              Skriv til os. Vi viser jer præcis, hvordan Care Portal og Lys fungerer i jeres drift.
            </p>
            <MarketingContactForm source="institutioner" responseWeekdays={2} />
          </div>
        </section>
      </div>
    </div>
  );
}

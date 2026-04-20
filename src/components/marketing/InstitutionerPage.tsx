'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import MarketingContactForm from '@/components/marketing/MarketingContactForm';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { useBudrLandingFadeIn } from '@/components/marketing/useBudrLandingFadeIn';

// Skift denne URL ud når Cal.com-kontoen er oprettet.
// Opret konto på cal.com → "New event type" → "20 min demo" → kopiér dit link hertil.
const BOOKING_URL = 'https://cal.eu/budr-care/20-min-demo-budr-care';
const BOOK_DEMO_CTA = 'Book 20 min. demo →';

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
              <div className="institutioner-brand-actions">
                <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-sm">
                  {BOOK_DEMO_CTA}
                </a>
              </div>
              <nav className="institutioner-nav-links" aria-label="Sidenavigation">
                <a href="#problem">Problemet</a>
                <a href="#loesning">Løsningen</a>
                <a href="#maalgruppe">For hvem</a>
                <a href="#implementering">Implementering</a>
              </nav>
            </div>
            <p className="eyebrow">Til ledere og koordinatorer i socialpsykiatrien</p>
            <h1 className="section-h institutioner-hero-title">
              Dokumentation og overdragelse. Et sted. Fra dag ét.
            </h1>
            <p className="section-p">
              BUDR Care samler Care Portal og borger-appen Lys i ét driftssystem. Personalet
              arbejder på fælles grundlag. Borgeren er med i flowet. Ledelsen ser status uden at
              spørge sig frem.
            </p>
            <ul className="intro-detail-list institutioner-hero-list">
              <li>Én platform til borger, team og ledelse.</li>
              <li>Tydelig dokumentation med kladde og godkendt status.</li>
              <li>Pilot med klare mål før fuld udrulning.</li>
            </ul>
            <div className="hero-actions">
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                {BOOK_DEMO_CTA}
              </a>
              <Link href="/care-portal-demo" className="btn-ghost">
                Prøv demo
              </Link>
            </div>
          </div>
        </section>

        <section className="institutioner-problem fi" id="problem">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Tre scenarier I kender fra hverdagen</h2>
            <p className="section-p">
              <strong>Kl. 06:00.</strong> Nattevagten overleverer mundtligt. Dagvagten noterer hvad
              den kan. Resten forsvinder. Næste kollega starter bagud og ved det ikke.
            </p>
            <p className="section-p">
              <strong>Kl. 14:30.</strong> Journalen er ikke godkendt. Lederen kender ikke status.
              Teamet er usikkert på hvad der er dokumenteret fakta, og hvad der er en kladde fra i
              torsdags.
            </p>
            <p className="section-p">
              <strong>Kl. 16:00.</strong> Borgeren sendte et signal i Lys. Det lå i et system.
              Teamet arbejdede i et andet. Ingen reagerede — ikke fordi de ikke ville, men fordi
              forbindelsen ikke er der.
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

        <section className="institutioner-social-proof fi" id="tilgang">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Vi bygger med jer, ikke til jer.</h2>
            <p className="section-p">
              Et pilotforløb med BUDR Care er ikke en standardlicens med en onboarding-PDF. Vi
              sætter os ind i jeres hverdag, jeres teams og jeres borgere — og vi tilpasser forløbet
              derefter.
            </p>
            <p className="section-p">
              I bestemmer hvad der måles på. Vi dokumenterer effekten løbende. Hvis det ikke virker
              i praksis, vil vi vide det — og vi justerer.
            </p>
            <div className="hero-actions">
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                {BOOK_DEMO_CTA}
              </a>
              <Link href="/care-portal-demo" className="btn-ghost">
                Prøv demo
              </Link>
            </div>
          </div>
        </section>

        <section className="institutioner-target fi" id="maalgruppe">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Hvem er det for?</h2>
            <div className="institutioner-list-grid">
              <article className="institutioner-list-card">
                <h3>Dig som leder</h3>
                <p>
                  Du får realtidsoverblik over dokumentationsstatus, journalgodkendelser og
                  borger-signaler — uden at spørge dig frem eller samle manuelt. Og du kan vise
                  kommunen og tilsynet præcis hvad der sker i drift.
                </p>
              </article>
              <article className="institutioner-list-card">
                <h3>Dine medarbejdere</h3>
                <p>
                  De bruger i dag tid på at lede efter kontekst fra forrige vagt. Med BUDR Care
                  starter de i stedet med et fælles overblik, AI-hjælp til journalen og borgeren
                  allerede tjekket ind.
                </p>
              </article>
              <article className="institutioner-list-card">
                <h3>Kommunale beslutningstagere</h3>
                <p>
                  Til tilbudskonsulenter og socialchefer med ansvar for kvalitet og dokumentation på
                  tværs af tilbud. Data følger driften — ikke omvendt.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="institutioner-implementation fi" id="implementering">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Implementering</h2>
            <div className="institutioner-list-grid institutioner-list-grid--four">
              <article className="institutioner-list-card">
                <h3>Plan</h3>
                <p>Vi planlægger forløbet med ledelse og nøglepersoner.</p>
              </article>
              <article className="institutioner-list-card">
                <h3>Onboarding</h3>
                <p>Vi står for opsætning, træning og opstart af teamet.</p>
              </article>
              <article className="institutioner-list-card">
                <h3>Driftsstøtte</h3>
                <p>Vi følger tæt op i opstartsperioden med faste checkpoints.</p>
              </article>
              <article className="institutioner-list-card">
                <h3>Effektmåling</h3>
                <p>Vi dokumenterer effekten, så I kan beslutte næste skridt.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="institutioner-pilot fi" id="pilot">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Pilot</h2>
            <div className="institutioner-list-grid institutioner-list-grid--single">
              <article className="institutioner-list-card">
                <h3>Kort forløb med klare succeskriterier</h3>
                <p>
                  Piloten afklarer drift, adfærd og effekt i praksis. Pilotpakken leveres efter
                  første møde.
                </p>
              </article>
            </div>
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

        <section className="institutioner-faq fi" id="faq">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Spørgsmål vi ofte får</h2>
            <div className="inst-faq-list">
              <details className="inst-faq-item">
                <summary>Kræver det godkendelse fra vores IT-afdeling?</summary>
                <p>
                  Platformen kører i skyen på Supabase med EU-hosting og kræver ikke lokal
                  installation. Teknisk dokumentation og underdatabehandlerliste kan udleveres til
                  jeres IT og DPO inden piloten sættes i gang.
                </p>
              </details>
              <details className="inst-faq-item">
                <summary>Hvad koster det?</summary>
                <p>
                  Vi aftaler pris efter første møde, når vi kender jeres størrelse og behov. Piloten
                  har en fast lav pris. Fuld drift prissættes per botilbud. Kontakt os for et
                  konkret tilbud.
                </p>
              </details>
              <details className="inst-faq-item">
                <summary>Hvad hvis personalet ikke vil bruge et nyt system?</summary>
                <p>
                  Det er den vigtigste indvending — og den reelle. Vores onboarding er tilrettelagt
                  til, at personalet ser effekten af systemet fra dag ét: færre spørgsmål ved
                  vagtskiftet, AI-hjælp til journalen, borgerens status klar uden at spørge sig
                  frem. Vi følger op tæt i opstartsperioden.
                </p>
              </details>
              <details className="inst-faq-item">
                <summary>Er BUDR Care GDPR-compliant?</summary>
                <p>
                  Data behandles og opbevares i EU. Platformen er bygget med rollebaseret
                  adgangsstyring, og borgernes data er adskilt fra personalets. Vi leverer
                  underdatabehandleraftale og teknisk dokumentation til DPO-gennemgang.
                </p>
              </details>
              <details className="inst-faq-item">
                <summary>Integrerer det med vores eksisterende journalsystem?</summary>
                <p>
                  BUDR Care er ikke afhængigt af integration med eksisterende systemer for at virke.
                  Det kører parallelt og erstatter typisk ad hoc-dokumentation og mundtlige
                  overleveringer. Integrationer kan aftales på sigt.
                </p>
              </details>
            </div>
          </div>
        </section>

        <section className="cta-section institutioner-contact" id="kontakt">
          <div className="cta-bg" aria-hidden />
          <div className="shell fi institutioner-contact-inner">
            <h2>Book en gennemgang.</h2>
            <p className="cta-lead">
              Vi viser systemet. I fortæller hvad der ikke virker i dag. Derfra beslutter I.
            </p>

            <div className="booking-block">
              <h3>20 minutter — video eller telefon</h3>
              <ul className="booking-what">
                <li>Vi gennemgår Care Portal og Lys live</li>
                <li>I stiller de spørgsmål, der er relevante for jer</li>
                <li>Vi aftaler eventuelt næste skridt — ingen forpligtelse</li>
              </ul>
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-booking"
              >
                Vælg et tidspunkt →
              </a>
              <p className="booking-note">
                Åbner i nyt vindue · Gratis · Ingen forberedelse nødvendig
              </p>
            </div>

            <div className="booking-or">eller</div>

            <p className="booking-form-label">Foretrækker I en besked?</p>
            <MarketingContactForm source="institutioner" responseWeekdays={2} />
          </div>
        </section>
        <MarketingFooter />
      </div>
    </div>
  );
}

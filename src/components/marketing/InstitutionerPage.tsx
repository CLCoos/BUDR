'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import { BOOKING_URL } from '@/components/marketing/constants';
import MarketingContactForm from '@/components/marketing/MarketingContactForm';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { useBudrLandingFadeIn } from '@/components/marketing/useBudrLandingFadeIn';

const BOOK_DEMO_CTA = 'Book pilot-samtale →';

const INSTITUTIONER_FAQ = [
  {
    q: 'Kræver det godkendelse fra vores IT-afdeling?',
    a: 'Platformen kører i skyen med EU-hosting og kræver ikke lokal installation. Teknisk dokumentation og underdatabehandlerliste kan udleveres til jeres IT og DPO inden piloten sættes i gang.',
  },
  {
    q: 'Erstatter BUDR vores nuværende journalsystem?',
    a: 'Nej. BUDR supplerer. Den daglige journal kan ligge i Sensum, Nexus eller Planner4You — BUDR tilføjer recovery-laget ovenpå.',
  },
  {
    q: 'Kan systemet bruges sammen med eksisterende journalsystem?',
    a: 'Ja. BUDR er designet til at køre parallelt med jeres journal. Recovery-data kan eksporteres og — efter pilot — integreres case-by-case med kommunale systemer.',
  },
  {
    q: 'Hvad koster det?',
    a: 'Piloten er gratis i 3 måneder. Efterfølgende prissættes efter størrelse (Start/Vækst/Organisation). Vi sender den fulde prisstruktur efter indledende samtale.',
  },
  {
    q: 'Hvad hvis personalet ikke vil bruge et nyt system?',
    a: 'Onboarding er tilrettelagt så personalet mærker effekt fra dag ét: færre huller ved vagtskifte, tydeligere recovery-billede, borgerens stemme synlig. Vi følger op tæt i opstartsperioden.',
  },
  {
    q: 'Overholder BUDR Care GDPR?',
    a: 'Data behandles og opbevares i EU. Platformen er bygget med rollebaseret adgangsstyring, og borgernes data er adskilt fra personalets. Vi leverer databehandleraftale og teknisk dokumentation til DPO-gennemgang.',
  },
  {
    q: 'Hvordan håndterer I borgere uden samtykke-evne?',
    a: 'Processen for information og samtykke er bostedets ansvar. Care Portal kan bruges af personalet uden borger-app, når Lys ikke er relevant for den enkelte borger.',
  },
  {
    q: 'Hvad sker der hvis I lukker ned som firma?',
    a: 'Databehandleraftalen regulerer overdragelse og sletning. Bostedet kan til enhver tid eksportere data. Ved opsigelse følger vi aftalt dataansættelsesplan.',
  },
  {
    q: 'Kan vi se referencer fra andre bosteder?',
    a: 'Vi deler erfaringer fra pilotforløb efter aftale, når bosteder ønsker det. Kontakt os for at høre om aktuelle forløb.',
  },
] as const;

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
              <Link href="/" className="nav-logo" aria-label="BUDR — forsiden">
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
                <a href="#pilot">Pilot</a>
                <a href="#teknik">IT og DPO</a>
                <a href="#faq">FAQ</a>
              </nav>
            </div>
            <p className="eyebrow">Til ledere, fagchefer og kommunale indkøbere</p>
            <h1 className="section-h institutioner-hero-title">
              Recovery, dokumentation og overlevering — bundet sammen
            </h1>
            <p className="section-p">
              BUDR er det første danske system bygget på CHIME-rammeværket (Leamy et al., 2011).
              Personalet får sammenhæng. Borgeren får en stemme i sit eget forløb. Ledelsen får
              dokumentation der dækker både tilsyn og recovery-praksis.
            </p>
            <ul className="intro-detail-list institutioner-hero-list">
              <li>CHIME som faglig rygrad — ikke kun journal og vagtskifte.</li>
              <li>Care Portal og Lys i samme recovery-flow.</li>
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
            <h2 className="section-h">Den usynlige overlevering</h2>
            <p className="section-p">
              <strong>Kl. 06:00.</strong> Nattevagten overleverer mundtligt. Det vigtigste ligger i
              hukommelsen — ikke i et recovery-billede teamet kan bygge videre på. Næste kollega
              starter bagud.
            </p>
            <p className="section-p">
              <strong>Kl. 14:30.</strong> Journalen er fyldt, men recovery-retningen er usynlig.
              Lederen ser notater, ikke mønstre over uger. Teamet dokumenterer — uden fælles
              retning.
            </p>
            <p className="section-p">
              <strong>Kl. 16:00.</strong> Borgeren skrev en refleksion i Lys. Den nåede ikke den
              vagt der kunne handle. Ikke fordi personalet ikke ville — men fordi fragmentering er
              strukturel.
            </p>
          </div>
        </section>

        <section className="institutioner-solution fi" id="loesning">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Ét system. To produkter. Samme recovery.</h2>
            <p className="section-p">
              Care Portal er personalets cockpit til vagtoverdragelse, journal, recovery-trends og
              AI-støttet dokumentation. Lys er borgerens egen app til check-in, refleksioner og
              næste skridt — med kontrol over hvad personalet ser.
            </p>

            <h3 className="institutioner-sub-h">CHIME som faglig rygrad</h3>
            <p className="section-p">
              BUDR er bygget på CHIME (Connectedness, Hope, Identity, Meaning, Empowerment) — et
              internationalt anerkendt rammeværk for personlig recovery (Leamy et al., British
              Journal of Psychiatry, 2011). Hver borgerprofil, hver refleksion, hvert næste skridt
              forholder sig til mindst én CHIME-dimension.
            </p>

            <h3 className="institutioner-sub-h">Hvorfor CHIME, og ikke andre rammeværk?</h3>
            <p className="section-p">
              CHIME er valgt frem for Recovery Star eller WRAP fordi det er evidensbaseret og
              peer-reviewed, bredt anvendt internationalt (UK, Australien, Skandinavien), og
              oversætter sig direkte til daglig praksis — ikke kun assessment.
            </p>
            <p className="section-p">
              <a
                href="https://pubmed.ncbi.nlm.nih.gov/21245157/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Læs Leamy et al. 2011 (originalstudiet) →
              </a>
            </p>

            <h3 className="institutioner-sub-h">KRAP-kompatibilitet</h3>
            <p className="section-p">
              Mange danske bosteder arbejder allerede med KRAP (Kognitiv, Ressourcefokuseret og
              Anerkendende Praksis). BUDR er designet til at supplere KRAP-arbejdet, ikke erstatte
              det.
            </p>
            <p className="section-p">
              CHIME&apos;s fem dimensioner og KRAP&apos;s grundprincipper overlapper betydeligt —
              men hvor KRAP fokuserer på kognitiv metode, fokuserer CHIME på recovery-udfald. Sammen
              giver de en helstøbt faglig praksis.
            </p>
          </div>
        </section>

        <section className="institutioner-contrast fi" id="differentiering">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Vi bygger til recovery-praksis, ikke bare drift</h2>
            <p className="section-p">
              BUDR er ikke et journalværktøj med ekstra knapper. Det er et recovery-system der
              binder vagtoverdragelse, dokumentation og borgerens egen stemme — uden at personalet
              skal arbejde i parallelle virkeligheder.
            </p>
            <p className="section-p">
              I starter med en pilot med målbare succeskriterier. Når recovery-praksis styrkes,
              udvider I. I ejer data. I ejer tempoet.
            </p>
          </div>
        </section>

        <section className="institutioner-social-proof fi" id="tilgang">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Vi bygger med jer, ikke til jer.</h2>
            <p className="section-p">
              Et pilotforløb med BUDR er ikke en standardlicens med en onboarding-PDF. Vi sætter os
              ind i jeres recovery-arbejde, jeres teams og jeres borgere — og vi tilpasser forløbet
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
                  Du får overblik over recovery-trends, dokumentationsstatus og borgerens stemme i
                  forløbet — uden at samle manuelt. Du kan vise kommunen og tilsynet et helstøbt
                  billede af praksis.
                </p>
              </article>
              <article className="institutioner-list-card">
                <h3>Dine medarbejdere</h3>
                <p>
                  De møder borgere med kontekst fra refleksioner og næste skridt — ikke kun
                  gårsdagens mundtlige overlevering. Journal og recovery arbejder i samme flow.
                </p>
              </article>
              <article className="institutioner-list-card">
                <h3>Kommunale beslutningstagere</h3>
                <p>
                  Til tilbudskonsulenter og socialchefer med ansvar for kvalitet og recovery på
                  tværs af tilbud. Evidensbaseret ramme, tydelig datapolitik, pilot før skala.
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
                <p>Vi planlægger recovery-piloten med ledelse og nøglepersoner.</p>
              </article>
              <article className="institutioner-list-card">
                <h3>Onboarding</h3>
                <p>Opsætning, træning i CHIME-flow og opstart for teamet.</p>
              </article>
              <article className="institutioner-list-card">
                <h3>Driftsstøtte</h3>
                <p>Faste checkpoints og justering i pilotperioden.</p>
              </article>
              <article className="institutioner-list-card">
                <h3>Effektmåling</h3>
                <p>Dokumentation af recovery-indikatorer I vælger sammen.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="institutioner-pilot home-pilot-steps fi" id="pilot">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Vi starter småt, sammen</h2>
            <div className="pilot-steps-grid">
              <article className="pilot-step">
                <span className="step-number" aria-hidden>
                  1
                </span>
                <h3>Indledende samtale</h3>
                <p className="step-duration">15 min</p>
                <p>Vi forstår jeres hverdag, dokumentationsbyrde og recovery-arbejde i dag.</p>
                <a
                  href={BOOKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="step-cta"
                >
                  Book intromøde →
                </a>
              </article>
              <article className="pilot-step">
                <span className="step-number" aria-hidden>
                  2
                </span>
                <h3>Pilot på én afdeling</h3>
                <p className="step-duration">3 måneder</p>
                <p>5-10 borgere. Vi sætter op, træner personalet, justerer løbende.</p>
              </article>
              <article className="pilot-step">
                <span className="step-number" aria-hidden>
                  3
                </span>
                <h3>Evaluering og udrulning</h3>
                <p className="step-duration">Sammen</p>
                <p>Konkret data på hvad der virkede. Beslutning tages sammen.</p>
              </article>
            </div>
            <ul className="pilot-trust-signals">
              <li>Ingen binding ud over pilotperioden</li>
              <li>Dansk hosting (Hetzner FSN1)</li>
              <li>GDPR-databehandleraftale</li>
              <li>Fuld dataeksport ved opsigelse</li>
            </ul>
          </div>
        </section>

        <section className="institutioner-tech fi" id="teknik">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Til IT og DPO</h2>
            <p className="section-p">
              Teknisk dokumentation og underdatabehandlerliste leveres til jeres IT og DPO på
              forespørgsel. <a href="#kontakt">Kontakt os →</a>
            </p>

            <h3 className="institutioner-sub-h">Hvad logges?</h3>
            <ul className="institutioner-tech-list">
              <li>
                <strong>Borger-data:</strong> Refleksioner, check-ins, næste skridt,
                recovery-fortællinger
              </li>
              <li>
                <strong>Personale-data:</strong> Journal-indtastninger, vagtoverdragelser,
                AI-foreslåede mønstre
              </li>
              <li>
                <strong>System-logs:</strong> Login-events, fejlrapporter (anonymiseret)
              </li>
            </ul>

            <h3 className="institutioner-sub-h">Hvor længe gemmes data?</h3>
            <p className="section-p">
              I henhold til Sundhedsstyrelsens vejledning og databehandleraftalen. Standard: 5 år
              efter borgers udflytning. Borger kan til enhver tid anmode om sletning af egne
              refleksioner og fortællinger.
            </p>

            <h3 className="institutioner-sub-h">Datalokation</h3>
            <p className="section-p">
              Alt data hostes hos Hetzner i Falkenstein, Tyskland (EU). Krypteret i hvile (AES-256)
              og under transport (TLS 1.3). Ingen data forlader EU.
            </p>

            <h3 className="institutioner-sub-h">DPA-skabelon</h3>
            <p className="section-p">
              <a href="/legal/budr-dpa-template-v1.pdf">
                Download databehandleraftale-skabelon (PDF)
              </a>
            </p>
            <p className="section-p">
              Den endelige aftale tilpasses jeres situation og underskrives før pilotstart.
            </p>
          </div>
        </section>

        <section className="institutioner-faq fi" id="faq">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Spørgsmål vi ofte får</h2>
            <div className="inst-faq-list">
              {INSTITUTIONER_FAQ.map((item) => (
                <details key={item.q} className="inst-faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-section institutioner-contact" id="kontakt">
          <div className="cta-bg" aria-hidden />
          <div className="shell fi institutioner-contact-inner">
            <h2>Book en gennemgang.</h2>
            <p className="cta-lead">
              Vi viser systemet. I fortæller hvor jeres recovery-arbejde er i dag. Derfra beslutter
              I.
            </p>

            <div className="booking-block">
              <h3>20 minutter — video eller telefon</h3>
              <ul className="booking-what">
                <li>Vi gennemgår Care Portal og Lys live</li>
                <li>I stiller de spørgsmål, der er relevante for jer</li>
                <li>Vi aftaler eventuelt næste skridt — ingen forpligtelser</li>
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

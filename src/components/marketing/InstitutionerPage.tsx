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
    q: 'Erstatter BUDR vores nuværende journalsystem?',
    paragraphs: [
      'For mindre socialpsykiatriske bosteder med 5-25 borgere, hvor BUDR-funktionaliteten dækker jeres dokumentationsbehov: ja. BUDR er bygget som komplet driftssystem — journal, vagtoverdragelse, dokumentation, recovery-arbejde og borgerinddragelse i ét system.',
      'For større bosteder eller bosteder med intern medicinhåndtering har vi FMK- og MedCom-integration på roadmap for 2027. Vi vurderer det altid konkret sammen ved indledende samtale.',
    ],
  },
  {
    q: 'Understøtter BUDR VUM 2.0?',
    paragraphs: [
      "Ja. BUDR's datamodel mapper direkte til VUM 2.0's 11 udredningstemaer og Fælles Faglige Begreber. CHIME-rammeværket matcher VUM 2.0's fokus på recovery-orienteret rehabilitering — to lag af samme faglige praksis.",
    ],
  },
  {
    q: 'Hvad med GDPR?',
    paragraphs: [
      "Vi indgår databehandleraftale før pilotstart. Data hostes i Tyskland (Hetzner FSN1) under EU's databeskyttelseslovgivning. Borgerdata krypteres i hvile (AES-256) og under transport (TLS 1.3).",
    ],
  },
  {
    q: "Hvad kan AI'en gøre — og hvad kan den ikke?",
    paragraphs: [
      "AI'en hjælper med at strukturere refleksioner, foreslå journalformuleringer og synliggøre mønstre i borgerens recovery. Den diagnosticerer ikke, behandler ikke, og tager aldrig beslutninger. Personalet er altid i førersædet.",
    ],
  },
  {
    q: 'Hvad hvis en borger ikke kan bruge en app?',
    paragraphs: [
      "Lys er designet til at være brugbar selv ved svære dage. Men hvis en borger ikke kan eller vil bruge app'en, fungerer Care Portal alligevel; personalet kan dokumentere uden borger-app'en.",
    ],
  },
  {
    q: 'Hvad koster det?',
    paragraphs: [
      'Pilot er gratis i 3 måneder. Efterfølgende: tre prismodeller (Start/Vækst/Organisation) afhængigt af bostedets størrelse. Vi sender den fulde prisstruktur efter indledende samtale.',
    ],
  },
  {
    q: 'Hvem ejer dataene?',
    paragraphs: [
      'Bostedet og borgeren. Vi er databehandler — ikke ejer. Fuld eksport ved opsigelse i standardformater (CSV, JSON, PDF).',
    ],
  },
  {
    q: 'Hvad med tilsynsrapporter?',
    paragraphs: [
      'BUDR genererer eksportbare dokumentationsrapporter til socialtilsyn baseret på Social- og Boligstyrelsens kvalitetsmodel. Personalet kan fremvise journalhistorik, indsatsmål og recovery-progression direkte fra systemet.',
    ],
  },
  {
    q: 'Kræver det godkendelse fra vores IT-afdeling?',
    paragraphs: [
      'Platformen kører i skyen med EU-hosting og kræver ikke lokal installation. Teknisk dokumentation og underdatabehandlerliste kan udleveres til jeres IT og DPO inden piloten sættes i gang.',
    ],
  },
  {
    q: 'Kan vi eksportere VUM 2.0-status til vores kommunes myndighedssystem?',
    paragraphs: [
      'Ja. BUDR genererer strukturerede VUM 2.0-rapporter i standardformater (PDF, JSON) der kan importeres i Sensum, Nexus eller andre myndighedssystemer.',
    ],
  },
  {
    q: 'Hvordan håndterer I borgere uden samtykkeevne?',
    paragraphs: [
      'BUDR understøtter §129-procedurer og pårørende-adgang når relevant. Borgerprofiler kan konfigureres til at undlade Lys-app for borgere der ikke har samtykkeevne.',
    ],
  },
  {
    q: 'Hvad sker der hvis I lukker ned som firma?',
    paragraphs: [
      'Fuld dataeksport i standardformater er garanteret i databehandleraftalen. Vi forpligter os på 90 dages overgangsperiode for migration.',
    ],
  },
  {
    q: 'Kan vi se referencer?',
    paragraphs: [
      'Vi er i pilotfase med vores første kunder. Når referencer er klare med samtykke, deler vi dem. Indtil da kan vi vise Saras reelle forløb live i systemet.',
    ],
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
                <a href="#passer-budr">Passer det?</a>
                <a href="#loesning">Driftssystem</a>
                <a href="#pilot">Pilot</a>
                <a href="#teknik">IT og DPO</a>
                <a href="#faq">FAQ</a>
              </nav>
            </div>
            <p className="eyebrow">Til ledere og fagchefer på socialpsykiatriske bosteder</p>
            <h1 className="section-h institutioner-hero-title">
              Det første driftssystem bygget på recovery
            </h1>
            <p className="section-p">
              BUDR samler journal, vagtoverdragelse, dokumentation og recovery-arbejde i ét system.
              Bygget på CHIME-rammeværket og VUM 2.0-kompatibelt.
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

        <section className="institutioner-fit fi" id="passer-budr">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Er BUDR det rigtige for jer?</h2>
            <div className="institutioner-fit-grid">
              <div className="institutioner-fit-col fit-yes">
                <h3>Ja, hvis I er:</h3>
                <ul>
                  <li>Socialpsykiatrisk bosted med 5-25 borgere</li>
                  <li>Privat eller selvejende tilbud</li>
                  <li>Leverer §85-støtte og recovery-orienteret rehabilitering</li>
                  <li>
                    Medicinhåndtering via beboers egen læge, hjemmesygepleje eller eksisterende
                    FMK-løsning
                  </li>
                  <li>Klar til at give borgeren en stemme i sit eget forløb</li>
                </ul>
              </div>
              <div className="institutioner-fit-col fit-no">
                <h3>Endnu ikke, hvis I:</h3>
                <ul>
                  <li>
                    Har intern medicinhåndtering med behov for FMK-integration (på roadmap 2027)
                  </li>
                  <li>Skal kommunikere med læger via MedCom (på roadmap 2027)</li>
                  <li>Har behov for kommunal myndighedsintegration på direktørniveau</li>
                </ul>
              </div>
            </div>
            <p className="institutioner-fit-note">
              Vi vurderer det altid konkret sammen ved indledende samtale. Ærlighed sparer os begge
              for tid.
            </p>
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
            <h2 className="section-h">BUDR som komplet driftssystem</h2>
            <p className="section-p">
              Care Portal samler personalets daglige arbejde: journal, vagtoverdragelse,
              AI-assisteret dokumentation, advarselssystem ved kritiske mønstre, VUM 2.0-skabeloner
              og recovery-trends over tid.
            </p>
            <p className="section-p">
              Lys giver borgeren plads i sit eget forløb: refleksioner, daglige check-ins, egne
              næste skridt formuleret med personalet, samling af recovery-fortællinger.
            </p>
            <p className="section-p">
              Når borgeren registrerer i Lys, handler personalet i Care Portal. Ingen
              dobbeltarbejde. Ingen tabt kontekst. Et system.
            </p>

            <h3 className="institutioner-sub-h">To rammer. Samme retning.</h3>
            <p className="section-p">
              BUDR er bygget på CHIME — det internationalt anerkendte rammeværk for personlig
              recovery (Leamy et al., British Journal of Psychiatry, 2011). Fem dimensioner som
              personale og borger arbejder med sammen: Connectedness, Hope, Identity, Meaning,
              Empowerment.
            </p>
            <p className="section-p">
              <a
                href="https://pubmed.ncbi.nlm.nih.gov/22130746/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Læs Leamy et al. 2011 (originalstudiet) →
              </a>
            </p>

            <h3 className="institutioner-sub-h">VUM 2.0-kompatibel</h3>
            <p className="section-p">
              Social- og Boligstyrelsens Voksenudredningsmetode 2.0 har &quot;recovery-orienteret
              rehabilitering&quot; som ét af fire faglige fokusområder. BUDR&apos;s datamodel mapper
              direkte til VUM 2.0&apos;s 11 udredningstemaer og Fælles Faglige Begreber.
            </p>
            <p className="section-p">
              Det betyder: I kan dokumentere recovery-arbejde i BUDR og levere VUM 2.0-status til
              kommunen i samme arbejdsgang.
            </p>

            <h3 className="institutioner-sub-h">KRAP-kompatibel</h3>
            <p className="section-p">
              Mange danske bosteder arbejder allerede med KRAP (Kognitiv, Ressourcefokuseret og
              Anerkendende Praksis). BUDR&apos;s PARK-metodologi bygger på samme tre søjler: fakta
              og ressourcer, tankemønstre og mestring, måltrappe og handlingsplan.
            </p>
            <p className="section-p">
              CHIME, VUM 2.0 og KRAP/PARK arbejder sammen — ikke ovenpå hinanden.
            </p>
          </div>
        </section>

        <section className="institutioner-contrast fi" id="differentiering">
          <div className="shell institutioner-copy-shell">
            <h2 className="section-h">Vi bygger til recovery-praksis, ikke bare drift</h2>
            <p className="section-p">
              BUDR er ikke et journalværktøj med ekstra knapper. Det er et driftssystem der samler
              vagtoverdragelse, dokumentation og borgerens egen stemme — uden at personalet skal
              arbejde i parallelle virkeligheder.
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
                <p>5-15 borgere. Vi sætter op, træner personalet, justerer løbende.</p>
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
                <strong>Personale-data:</strong> Journal, vagtoverdragelser, AI-foreslåede mønstre
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
              Hetzner Falkenstein (FSN1), Tyskland (EU). AES-256 i hvile, TLS 1.3 under transport.
              Ingen data forlader EU.
            </p>

            <h3 className="institutioner-sub-h">Roadmap-transparens</h3>
            <p className="section-p">
              Vi er ikke ISO 27001-certificeret endnu. Det er roadmap for 2027. Vi tror på ærlighed
              frem for marketing-claims vi ikke kan stå inde for.
            </p>

            <h3 className="institutioner-sub-h">DPA-skabelon</h3>
            <p className="section-p">
              <a href="mailto:hej@budrcare.dk?subject=Anmodning%20om%20DPA-skabelon">
                Anmod om DPA-skabelon (sendes pr. mail)
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
                  {item.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
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

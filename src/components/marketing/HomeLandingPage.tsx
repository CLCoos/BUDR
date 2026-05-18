'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import { BOOKING_URL, CONTACT_EMAIL, CONTACT_URL } from '@/components/marketing/constants';
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

const HOME_FAQ = [
  {
    q: 'Erstatter BUDR vores nuværende journalsystem?',
    a: 'Nej. BUDR supplerer. Den daglige journal kan ligge i Sensum, Nexus eller Planner4You — BUDR tilføjer recovery-laget ovenpå.',
  },
  {
    q: 'Hvad med GDPR?',
    a: "Vi indgår databehandleraftale før pilotstart. Data hostes i Tyskland (Hetzner FSN1) under EU's databeskyttelseslovgivning. Borgerdata krypteres i hvile og under transport.",
  },
  {
    q: "Hvad kan AI'en gøre — og hvad kan den ikke?",
    a: "AI'en hjælper med at strukturere refleksioner og foreslå mønstre. Den diagnosticerer ikke, behandler ikke, og tager aldrig beslutninger. Personalet er altid i førersædet.",
  },
  {
    q: 'Hvad hvis en borger ikke kan bruge en app?',
    a: "Lys er designet til at være brugbar selv ved svære dage — minimal kognitiv belastning, store knapper, stemme-input. Men hvis en borger ikke kan eller vil bruge app'en, fungerer Care Portal alligevel; personalet kan bruge det som dokumentationsværktøj uden borger-app'en.",
  },
  {
    q: 'Hvad koster det?',
    a: 'Pilot er gratis i 3 måneder. Efterfølgende: tre prismodeller (Start/Vækst/Organisation) afhængigt af bostedets størrelse. Vi sender den fulde prisstruktur efter indledende samtale.',
  },
  {
    q: 'Hvem ejer dataene?',
    a: 'Bostedet og borgeren. Vi er databehandler — ikke ejer. Fuld eksport ved opsigelse.',
  },
  {
    q: 'Kan vi se en demo?',
    a: 'Ja. Book en samtale, så viser vi Saras reelle forløb live i systemet.',
  },
  {
    q: 'Hvad med integration til kommunens systemer?',
    a: 'Vi har eksport-formater for de mest brugte. Direkte integration er mulig efter pilot — det vurderes case-by-case.',
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
              <a href="#pilot">Pilot</a>
              <a href="#faq">FAQ</a>
              <a href="#kontakt">Kontakt</a>
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

          <section className="home-two-entrances fi" id="to-indgange">
            <div className="shell home-copy-shell">
              <h2 className="section-h">Ét system. To indgange.</h2>
              <div className="two-entrances-grid">
                <article className="entrance-card">
                  <h3>Personalet</h3>
                  <p className="entrance-product-name">Care Portal</p>
                  <p>
                    Webbaseret dashboard til hele teamet. Vagtoverdragelse med kontekst,
                    journal-skrivning støttet af AI, advarselssystem ved kritiske mønstre,
                    recovery-trends over tid. Bygget til at fjerne dokumentationsbyrden — ikke
                    tilføje endnu en fane.
                  </p>
                  <Link href="/institutioner#loesning" className="entrance-link">
                    Læs mere om Care Portal →
                  </Link>
                </article>
                <article className="entrance-card">
                  <h3>Borgeren</h3>
                  <p className="entrance-product-name">Lys</p>
                  <p>
                    Personlig recovery-app. Daglig check-in, refleksioner som tekst eller stemme,
                    egne næste skridt, samling af recovery-fortællinger. Borgeren bestemmer hvad
                    personalet ser. Ingen overvågning, ingen alarm-spam.
                  </p>
                  <Link href="/institutioner#maalgruppe" className="entrance-link">
                    Læs mere om Lys →
                  </Link>
                </article>
              </div>
            </div>
          </section>

          <section className="home-founder fi" id="grundlaegger">
            <div className="shell home-copy-shell home-founder-shell">
              <h2 className="section-h">Bygget af én der har arbejdet på gulvet</h2>
              <div className="founder-content">
                <p>
                  BUDR er grundlagt af Christian Cloos, der selv har arbejdet som pædagogmedhjælper
                  på et socialpsykiatrisk bosted. Frustrationen over værktøjer der ikke understøtter
                  recovery-praksis — kun dokumenterer den — var udgangspunktet for hele systemet.
                </p>
                <p>
                  Faglig sparring undervejs med psykologer, socialpædagoger og bostedsledere fra
                  hele landet. CHIME-rammeværket er valgt fordi det er evidensbaseret,
                  internationalt anerkendt, og oversætter sig direkte til daglig praksis.
                </p>
              </div>
            </div>
          </section>

          <section className="home-pilot-steps fi" id="pilot">
            <div className="shell home-copy-shell">
              <h2 className="section-h">Vi starter småt, sammen</h2>
              <div className="pilot-steps-grid">
                <article className="pilot-step">
                  <span className="step-number" aria-hidden>
                    1
                  </span>
                  <h3>Indledende samtale</h3>
                  <p className="step-duration">15 min</p>
                  <p>
                    Vi forstår jeres hverdag, jeres dokumentationsbyrde, jeres recovery-arbejde i
                    dag.
                  </p>
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

          <section className="home-faq fi" id="faq">
            <div className="shell home-copy-shell">
              <h2 className="section-h">Spørgsmål vi får oftest</h2>
              <div className="inst-faq-list home-faq-list">
                {HOME_FAQ.map((item) => (
                  <details key={item.q} className="inst-faq-item">
                    <summary>{item.q}</summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section className="home-final-cta fi" id="kontakt">
            <div className="shell home-final-cta-inner">
              <h2 className="section-h">Klar til at se det på jeres bosted?</h2>
              <p className="final-cta-subtext">
                15 minutters samtale. Ingen forpligtelser. Vi viser konkret hvordan Saras forløb ser
                ud i systemet, og vi lytter til hvor jeres bosted er i dag.
              </p>
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary final-cta-button"
              >
                Book pilot-samtale →
              </a>
              <p className="final-cta-fineprint">
                Vi svarer inden for 1 hverdag · {CONTACT_EMAIL} · BUDR ApS, Aalborg
              </p>
              <p className="final-cta-secondary">
                <Link href={CONTACT_URL}>Skriv til os</Link> i stedet for booking
              </p>
            </div>
          </section>
        </main>
        <MarketingFooter />
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import MarketingContactForm from '@/components/marketing/MarketingContactForm';
import { useBudrLandingFadeIn } from '@/components/marketing/useBudrLandingFadeIn';

const BOOK_MAIL =
  'mailto:hej@budrcare.dk?subject=Henvendelse%20fra%20institution%20—%20BUDR%20Care' as const;

const SECTION_IDS = [
  'inst-overblik',
  'maalgruppe',
  'implementering',
  'pilot',
  'tillid',
  'sikkerhed',
  'kontakt',
] as const;
type SectionId = (typeof SECTION_IDS)[number];

type InstitutionerPageProps = {
  className?: string;
};

export default function InstitutionerPage({ className = '' }: InstitutionerPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef<HTMLDivElement>(null);
  const scrollTicking = useRef(false);
  const [navOpen, setNavOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<SectionId>('inst-overblik');

  const closeNav = useCallback(() => setNavOpen(false), []);

  useBudrLandingFadeIn(rootRef);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nav = root.querySelector('nav');
    if (!nav) return;
    const setTop = () => {
      root.style.setProperty('--budr-nav-drawer-top', `${nav.getBoundingClientRect().height}px`);
    };
    setTop();
    const ro = new ResizeObserver(setTop);
    ro.observe(nav);
    window.addEventListener('resize', setTop);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', setTop);
    };
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1410px)');
    const onChange = () => {
      if (mq.matches) setNavOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const run = () => {
      scrollTicking.current = false;
      const navEl = rootRef.current?.querySelector('nav');
      const navBottom = navEl ? navEl.getBoundingClientRect().bottom : 88;
      const marker = navBottom + 28;

      const docEl = document.documentElement;
      const scrollable = docEl.scrollHeight - docEl.clientHeight;
      const prog = scrollable > 0 ? Math.min(1, Math.max(0, docEl.scrollTop / scrollable)) : 0;
      scrollProgressRef.current?.style.setProperty('transform', `scaleX(${prog})`);

      let active: SectionId = 'inst-overblik';
      for (const id of SECTION_IDS) {
        const section = document.getElementById(id);
        if (!section) continue;
        if (section.getBoundingClientRect().top <= marker) active = id;
      }
      setActiveNav((prev) => (prev === active ? prev : active));
    };

    const onScrollOrResize = () => {
      if (scrollTicking.current) return;
      scrollTicking.current = true;
      requestAnimationFrame(run);
    };

    run();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  return (
    <div ref={rootRef} className={`budr-landing ${className}`.trim()}>
      <nav aria-label="Primær navigation" className={navOpen ? 'is-open' : undefined}>
        <div className="nav-inner">
          <Link href="/" className="nav-logo" aria-label="BUDR Care — forsiden" onClick={closeNav}>
            <BudrLogo dark size={40} />
          </Link>
          <div className="nav-actions-bar">
            <a href="#kontakt" className="nav-mobile-demo" onClick={closeNav}>
              Skriv
            </a>
            <button
              type="button"
              className="nav-menu-toggle"
              aria-expanded={navOpen}
              aria-controls="institution-nav-panel"
              id="institution-nav-toggle"
              onClick={() => setNavOpen((o) => !o)}
            >
              <span className="nav-menu-toggle-bars" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              <span className="sr-only">{navOpen ? 'Luk menu' : 'Åbn menu'}</span>
            </button>
          </div>
          <ul className="nav-links" id="institution-nav-panel" role="list">
            <li>
              <a
                href="#inst-overblik"
                onClick={closeNav}
                className={activeNav === 'inst-overblik' ? 'nav-link--active' : undefined}
                {...(activeNav === 'inst-overblik' ? { 'aria-current': 'location' as const } : {})}
              >
                Overblik
              </a>
            </li>
            <li>
              <a
                href="#maalgruppe"
                onClick={closeNav}
                className={activeNav === 'maalgruppe' ? 'nav-link--active' : undefined}
                {...(activeNav === 'maalgruppe' ? { 'aria-current': 'location' as const } : {})}
              >
                Målgruppe
              </a>
            </li>
            <li>
              <a
                href="#implementering"
                onClick={closeNav}
                className={activeNav === 'implementering' ? 'nav-link--active' : undefined}
                {...(activeNav === 'implementering' ? { 'aria-current': 'location' as const } : {})}
              >
                Implementering
              </a>
            </li>
            <li>
              <a
                href="#pilot"
                onClick={closeNav}
                className={activeNav === 'pilot' ? 'nav-link--active' : undefined}
                {...(activeNav === 'pilot' ? { 'aria-current': 'location' as const } : {})}
              >
                Pilot
              </a>
            </li>
            <li>
              <a
                href="#tillid"
                onClick={closeNav}
                className={activeNav === 'tillid' ? 'nav-link--active' : undefined}
                {...(activeNav === 'tillid' ? { 'aria-current': 'location' as const } : {})}
              >
                Tillid
              </a>
            </li>
            <li>
              <a
                href="#sikkerhed"
                onClick={closeNav}
                className={activeNav === 'sikkerhed' ? 'nav-link--active' : undefined}
                {...(activeNav === 'sikkerhed' ? { 'aria-current': 'location' as const } : {})}
              >
                IT / DPO
              </a>
            </li>
            <li>
              <a
                href="#kontakt"
                className={`nav-cta${activeNav === 'kontakt' ? ' nav-link--active' : ''}`}
                onClick={closeNav}
                {...(activeNav === 'kontakt' ? { 'aria-current': 'location' as const } : {})}
              >
                Kontakt →
              </a>
            </li>
          </ul>
        </div>
        <div ref={scrollProgressRef} className="nav-scroll-progress" aria-hidden />
      </nav>

      <div className="budr-landing-content">
        <section
          className="intro-section intro-section--lead fi"
          id="inst-overblik"
          aria-label="Institutioner og beslutningstagere"
        >
          <div className="shell">
            <div className="intro-head">
              <div className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>
                Kommuner og botilbud
              </div>
              <h1 className="section-h" style={{ maxWidth: 'none', margin: '0 auto' }}>
                <em>Institutionsstien</em> — fra overblik til pilot
              </h1>
              <p className="intro-lead">
                Denne side er til jer, der skal forankre BUDR Care i organisationen:{' '}
                <strong>
                  hvilke tilbud vi understøtter, hvad implementering kræver, og hvordan en pilot
                  typisk ser ud.
                </strong>{' '}
                Produktet består af borger-appen Lys og Care Portal til personalet — ét fælles flow,
                som I også kan udforske på{' '}
                <Link href="/" style={{ color: 'var(--amber-lt)' }}>
                  forsiden
                </Link>
                .
              </p>
              <div className="hero-actions" style={{ justifyContent: 'center', marginTop: 28 }}>
                <a href="#kontakt" className="btn-primary">
                  Skriv til os (formular)
                </a>
                <Link href="/care-portal-demo" className="btn-ghost">
                  Prøv Care Portal-demo
                </Link>
                <a href={BOOK_MAIL} className="btn-ghost">
                  Eller e-mail
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="intro-section fi" id="maalgruppe" aria-label="Målgruppe">
          <div className="shell">
            <h2 className="section-h">
              <em>Hvem</em> er løsningen til?
            </h2>
            <p className="section-p">
              BUDR Care er udviklet til <strong>socialpsykiatriske og beslægtede botilbud</strong> —
              dvs. døgntilbud og lignende tilbud, hvor borgere med psykisk sårbarhed har brug for
              struktur, tryghed og fælles dokumentation i hverdagen. Området reguleres bl.a. af
              serviceloven; den præcise ydertype hos jer aftaler I internt som kommune eller tilbud.
            </p>
            <div className="intro-grid">
              <div className="intro-card fi fi-d1">
                <div className="intro-card-label">Tilbud</div>
                <h3 className="intro-card-h">Botilbud og koordinerende miljøer</h3>
                <p className="intro-card-p">
                  Ledelse, koordinatorer og team, der skal sikre overblik over trivsel, planer,
                  journal og medicin — på tværs af vagter og ved overdragelse.
                </p>
              </div>
              <div className="intro-card fi fi-d2">
                <div className="intro-card-label">Kommune</div>
                <h3 className="intro-card-h">Overblik og kvalitet</h3>
                <p className="intro-card-p">
                  Når I ønsker redskaber, der understøtter ensartet praksis, tryg dokumentation og
                  bedre kommunikation mellem borger og personale uden at øge administrativ byrde
                  unødigt.
                </p>
              </div>
              <div className="intro-card fi fi-d3">
                <div className="intro-card-label">Borgere</div>
                <h3 className="intro-card-h">Autonomi i hverdagen</h3>
                <p className="intro-card-p">
                  Lys giver borgeren en struktureret indgang til tjek-in og egne notater, så
                  personalet møder borgeren med aktuelle signaler — ikke bagkant.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="intro-section fi" id="implementering" aria-label="Implementering">
          <div className="shell">
            <h2 className="section-h">
              <em>Hvad</em> kræver det af jer?
            </h2>
            <p className="section-p">
              Implementering tilpasses jeres organisering. Nedenfor et typisk mønster —{' '}
              <strong>konkrete datoer og ressourcer</strong> aftaler vi, når I kontakter os.
            </p>
            <ul className="intro-detail-list">
              <li>
                <strong>Tidsforløb:</strong> Ofte <strong>2–6 uger</strong> fra beslutning til
                pilotdrift kan starte (afhænger af IT, godkendelser og oplæringsvinduer).
              </li>
              <li>
                <strong>Roller:</strong> Institutionsleder eller koordinator som ejer; nøglepersoner
                fra vagtlag; relevant kontakt til IT eller kvalitet efter jeres governance.
              </li>
              <li>
                <strong>Oplæring:</strong> Gennemgang af Care Portal (dashboard, journal, plan,
                360°), introduktion til Lys for udvalgte borgere — typisk opdelt efter vagtplan.
              </li>
              <li>
                <strong>Teknisk:</strong> Adgang via browser til portal; standard webtilgang til
                Lys. Krav til identitet og aftaler om dataroller beskrives i forbindelse med pilot
                og kontraktgrundlag.
              </li>
            </ul>
          </div>
        </section>

        <section className="intro-section fi" id="pilot" aria-label="Pilot">
          <div className="shell">
            <h2 className="section-h">
              <em>Piloten</em> — hvad indeholder den?
            </h2>
            <p className="section-p">
              En pilot er en <strong>afgrænset periode</strong>, hvor I tester værdien i egen drift
              med aftalt opfølgning. Indhold og længde tilpasses; her er hvad vi typisk enes om:
            </p>
            <ul className="intro-detail-list">
              <li>
                <strong>Varighed:</strong> Ofte <strong>8–12 uger</strong>, så teamet når både
                travle og roligere perioder.
              </li>
              <li>
                <strong>Succeskriterier:</strong> Fx tydeligere overblik ved vagtskifte, konkret
                brug af journal/godkendelsesflow, oplevelse af tryghed hos borgere og personale —
                måles i fællesskab før start.
              </li>
              <li>
                <strong>Support:</strong> Aftalte kontaktkanaler og forventet responstid i
                pilotperioden.
              </li>
              <li>
                <strong>Persondata:</strong> Roller som <strong>dataansvarlig</strong>, eventuel{' '}
                <strong>meddataansvar</strong> og <strong>underdatabehandlere</strong> reguleres
                skriftligt i jeres aftalegrundlag. Overordnet ramme findes i vores{' '}
                <Link href="/privacy" style={{ color: 'var(--amber-lt)' }}>
                  privatlivspolitik
                </Link>
                ; detaljer om databehandling og eventuelle AI-komponenter tilpasses den konkrete
                institution.
              </li>
            </ul>
            <p
              className="section-p"
              style={{ maxWidth: '40rem', margin: '0 auto', fontSize: '0.92rem' }}
            >
              Har I behov for at fremsende ark til DPO eller IT, kan vi understøtte med teknisk
              beskrivelse og underdatabehandlerliste —{' '}
              <a href={BOOK_MAIL} style={{ color: 'var(--amber-lt)' }}>
                kontakt os
              </a>
              .
            </p>
            <p
              className="section-p"
              style={{ maxWidth: '40rem', margin: '16px auto 0', fontSize: '0.92rem' }}
            >
              <Link href="/pilotpakke" style={{ color: 'var(--amber-lt)' }}>
                Se den fulde pilotpakke som et aftalt produkt (webside / PDF) →
              </Link>
            </p>
          </div>
        </section>

        <section className="intro-section fi" id="tillid" aria-label="Tillid og erfaring">
          <div className="shell">
            <h2 className="section-h">
              <em>Tillid</em> — erfaring uden at navngive
            </h2>
            <p className="section-p">
              I behøver ikke store navne på dag ét. Her er et{' '}
              <strong>sammensat, anonymiseret eksempel</strong> fra tidlig pilotfase med
              socialpsykiatriske botilbud — som illustrerer den problemkæde, vi ofte løser sammen
              med jer. Det er <strong>ikke</strong> et citeret udsagn fra en konkret institution.
            </p>
            <div
              className="intro-grid"
              style={{
                maxWidth: '960px',
                margin: '0 auto',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              }}
            >
              <div
                className="intro-card fi fi-d1"
                style={{
                  borderColor: 'rgba(217, 85, 85, 0.35)',
                  background: 'rgba(217, 85, 85, 0.06)',
                }}
              >
                <div className="intro-card-label">Udfordring</div>
                <h3 className="intro-card-h">Vagtskifte og uens fortælling</h3>
                <p className="intro-card-p">
                  Teamet oplevede, at overdragelse byggede på mundtlige statusser. Journal stod som
                  noter i forskellige stadier — og det var uklart, hvad der var formelt godkendt
                  dokumentation frem for udkast.
                </p>
              </div>
              <div
                className="intro-card fi fi-d2"
                style={{
                  borderColor: 'rgba(133, 183, 235, 0.45)',
                  background: 'rgba(133, 183, 235, 0.08)',
                }}
              >
                <div className="intro-card-label">Indsats</div>
                <h3 className="intro-card-h">Fælles flow i portalen</h3>
                <p className="intro-card-p">
                  Pilot med Care Portal og Lys: fælles overblik over tjek-in og planer, og journal
                  med <strong>kladde</strong> og <strong>godkendt</strong> status, så alle vagter
                  arbejder mod samme sandhed. Udvalgt personale tog ejerskab for godkendelse.
                </p>
              </div>
              <div
                className="intro-card fi fi-d3"
                style={{
                  borderColor: 'rgba(61, 191, 112, 0.4)',
                  background: 'rgba(61, 191, 112, 0.08)',
                }}
              >
                <div className="intro-card-label">Udfald</div>
                <h3 className="intro-card-h">Kortere overdragelse, mindre usikkerhed</h3>
                <p className="intro-card-p">
                  Overdragelse blev mere ensartet: mindre &ldquo;hvad vidste I?&rdquo;, tydeligere
                  grundlag for ledelses- og samarbejdssamtaler, og en oplevelse af, at borgerens
                  signaler nåede hele teamet hurtigere.
                </p>
              </div>
            </div>
            <p
              className="section-p"
              style={{
                maxWidth: '40rem',
                margin: '28px auto 0',
                fontSize: '0.9rem',
                color: 'var(--fog)',
              }}
            >
              Når I har reel drift med BUDR Care, kan I — hvis I ønsker det — erstatte dette med et
              aftalt citat eller en anonym case fra jeres egen organisation. Indtil da prioriterer
              vi ærlighed frem for antal botilbud på websitet.
            </p>
          </div>
        </section>

        <section className="intro-section fi" id="sikkerhed" aria-label="Sikkerhed og governance">
          <div className="shell">
            <h2 className="section-h">
              <em>Sikkerhed og governance</em> — til IT og DPO
            </h2>
            <p className="section-p">
              Kort oversigt over, hvordan løsningen typisk hænger sammen — så den kan vedlægges en
              intern vurdering. <strong>Juridisk præcision</strong> og fuld underdatabehandlerliste
              leveres i jeres aftale og kan suppleres på{' '}
              <a href={BOOK_MAIL} style={{ color: 'var(--amber-lt)' }}>
                forespørgsel
              </a>
              .
            </p>

            <div className="intro-grid" style={{ maxWidth: '920px', margin: '0 auto 24px' }}>
              <div className="intro-card fi fi-d1">
                <div className="intro-card-label">Hosting og data</div>
                <h3 className="intro-card-h">Hvor kører det?</h3>
                <p className="intro-card-p">
                  Websitet og portal-UI hostes typisk på <strong>Netlify</strong> (edge / CDN).
                  Primær datalagring og autentifikation sker i <strong>Supabase</strong> (managed{' '}
                  <strong>PostgreSQL</strong> og <strong>Auth</strong>). Konkret region, retention
                  og underdatabehandlerliste fremgår af databehandleraftalen med jer.
                </p>
              </div>
              <div className="intro-card fi fi-d2">
                <div className="intro-card-label">Adgangskontrol</div>
                <h3 className="intro-card-h">Hvem ser hvad?</h3>
                <p className="intro-card-p">
                  Personale logger ind via Supabase Auth. Adgang til beboerdata er begrænset til
                  jeres organisation via <strong>organisations-scoping</strong> og{' '}
                  <strong>Row Level Security (RLS)</strong> i databasen — så poster ikke krydser
                  institutions- eller organisationsgrænser som aftalt.
                </p>
              </div>
            </div>

            <div className="intro-grid" style={{ maxWidth: '920px', margin: '0 auto' }}>
              <div className="intro-card fi fi-d3">
                <div className="intro-card-label">Journal</div>
                <h3 className="intro-card-h">Kladde, godkendelse og logik</h3>
                <p className="intro-card-p">
                  Journalnotater kan være <strong>kladde</strong> eller <strong>godkendt</strong>.
                  Ved godkendelse knyttes handlingen til personale-identitet og tidspunkt (
                  <code className="text-xs opacity-90">approved_by</code> /{' '}
                  <code className="text-xs opacity-90">approved_at</code>). Udvalgte overblikke og
                  faglige AI-kontekster arbejder med <strong>godkendt</strong> journal, så udkast
                  ikke behandles som færdig dokumentation.
                </p>
              </div>
              <div className="intro-card fi fi-d1">
                <div className="intro-card-label">AI og underleverandører</div>
                <h3 className="intro-card-h">Hvor AI indgår</h3>
                <p className="intro-card-p">
                  Udvalgte funktioner kan kalde eksterne sprogmodeller for udkast og forslag (fx
                  faglig assistent, journalfortolkning eller planforslag). I produktion bruger
                  relevante API-ruter typisk <strong>Anthropic</strong>
                  (modelleverandør uden for EU). Formål, datasæt, prompt-behandling og overførsel
                  reguleres i <strong>databehandleraftalen</strong>; se også{' '}
                  <Link href="/privacy" style={{ color: 'var(--amber-lt)' }}>
                    privatlivspolitikken
                  </Link>{' '}
                  om underdatabehandlere og AI.
                </p>
              </div>
            </div>

            <p
              className="section-p"
              style={{
                maxWidth: '40rem',
                margin: '24px auto 0',
                fontSize: '0.9rem',
                color: 'var(--fog)',
              }}
            >
              Yderligere detaljer (fx audit-logning ved login efter aftale, kriseredskaber og
              beboer-sessioner) beskrives gerne i et teknisk bilag — skriv hvad jeres IT eller DPO
              efterspørger.
            </p>
          </div>
        </section>

        <section className="cta-section" id="kontakt" aria-label="Kontakt">
          <div className="cta-bg" aria-hidden />
          <div className="shell fi" style={{ position: 'relative', zIndex: 1 }}>
            <h2>
              <em>Kontakt</em> — gennemgang eller pilot
            </h2>
            <p className="cta-lead">
              Udfyld formularen — så har vi jeres henvendelse samlet og kan spore den internt. Tjek
              også spamfiltre: svar kommer fra{' '}
              <a href={BOOK_MAIL} style={{ color: 'var(--amber-lt)' }}>
                hej@budrcare.dk
              </a>
              .
            </p>
            <MarketingContactForm source="institutioner" responseWeekdays={2} />
            <div className="cta-actions" style={{ marginTop: 28 }}>
              <Link href="/care-portal-demo" className="btn-ghost">
                Prøv Care Portal-demo
              </Link>
              <Link href="/" className="btn-ghost">
                Tilbage til forsiden
              </Link>
            </div>
          </div>
        </section>

        <footer>
          <div className="footer-grid shell">
            <div>
              <div className="footer-logo">
                <BudrLogo dark size={36} />
              </div>
              <p className="footer-desc">
                Institutionssti til beslutningstagere. Hele produktet på forsiden.
              </p>
              <a
                href="mailto:hej@budrcare.dk"
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--fog)',
                  textDecoration: 'none',
                  marginTop: 8,
                  display: 'block',
                }}
              >
                hej@budrcare.dk
              </a>
            </div>
            <div className="footer-col">
              <h5>Produkter</h5>
              <Link href="/care-portal-demo">Care Portal demo</Link>
              <Link href="/care-portal-login">Log ind</Link>
              <Link href="/app">Lys</Link>
            </div>
            <div className="footer-col">
              <h5>Genveje</h5>
              <Link href="/">Forsiden</Link>
              <Link href="/for-botilbud/journal-og-digital-tilsyn">Journal &amp; tilsyn</Link>
              <Link href="/for-botilbud/varsling-socialpsykiatri">Varsling</Link>
              <Link href="/for-botilbud/plan-og-medicinoverblik">Plan &amp; medicin</Link>
              <a href="#maalgruppe">Målgruppe</a>
              <a href="#implementering">Implementering</a>
              <a href="#pilot">Pilot</a>
              <a href="#tillid">Tillid</a>
              <a href="#sikkerhed">Sikkerhed</a>
              <a href="#kontakt">Kontakt</a>
              <Link href="/pilotpakke">Pilotpakke</Link>
            </div>
            <div className="footer-col">
              <h5>Juridisk</h5>
              <Link href="/privacy">Privatlivspolitik</Link>
              <Link href="/cookies">Cookiepolitik</Link>
              <Link href="/terms">Vilkår</Link>
            </div>
          </div>
          <div className="footer-bottom shell">
            <span>© {new Date().getFullYear()} BUDR ApS · Aalborg, Danmark</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

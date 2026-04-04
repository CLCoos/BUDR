'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import {
  IconAlertBell,
  IconCareAction,
  IconCheck,
  IconDocMemory,
  IconJournal,
  IconLock,
  IconMedicine,
  IconMonitorPortal,
  IconMoodSignal,
  IconOverviewGrid,
  IconPhoneCheckin,
  IconPlanCheck,
  IconRoles,
  IconSearchDoc,
  IconShiftGap,
  IconShield,
  IconSyncSend,
  IconTeam,
  IconTraffic,
  IconUspBotilbud,
  IconUspOneTruth,
  IconUspRealtime,
  IconUspTrust,
  IconUser,
  IconWarning,
} from '@/components/marketing/LandingIcons';
import { LandingInteractiveDemo } from '@/components/marketing/LandingInteractiveDemo';
import { ResidentInitialsAbbr } from '@/components/marketing/ResidentInitialsAbbr';

type HomeLandingProps = {
  className?: string;
};

const BOOK_MAIL = 'mailto:hej@budrcare.dk?subject=Demo%20af%20BUDR%20Care' as const;

export default function HomeLanding({ className = '' }: HomeLandingProps) {
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.budr-landing .fi'));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('vis');
        });
      },
      { threshold: 0.08 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
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

  return (
    <div className={`budr-landing ${className}`.trim()}>
      <nav aria-label="Primær navigation" className={navOpen ? 'is-open' : undefined}>
        <div className="nav-inner">
          <Link href="/" className="nav-logo" aria-label="BUDR Care — forsiden" onClick={closeNav}>
            <BudrLogo dark size={40} />
          </Link>
          <div className="nav-actions-bar">
            <a href={BOOK_MAIL} className="nav-mobile-demo">
              Book
            </a>
            <button
              type="button"
              className="nav-menu-toggle"
              aria-expanded={navOpen}
              aria-controls="primary-nav-panel"
              id="primary-nav-toggle"
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
          <ul className="nav-links" id="primary-nav-panel" role="list">
            <li>
              <a href="#hvad-er-budr" onClick={closeNav}>
                Om BUDR
              </a>
            </li>
            <li>
              <a href="#problem-losning" onClick={closeNav}>
                Problem &amp; løsning
              </a>
            </li>
            <li>
              <a href="#sammenligning" onClick={closeNav}>
                Sammenligning
              </a>
            </li>
            <li>
              <a href="#fordele" onClick={closeNav}>
                Højdepunkter
              </a>
            </li>
            <li>
              <a href="#features" onClick={closeNav}>
                Funktioner
              </a>
            </li>
            <li>
              <a href="#tryghed" onClick={closeNav}>
                Tryghed
              </a>
            </li>
            <li>
              <a href="#prover-selv" onClick={closeNav}>
                Prøv demo
              </a>
            </li>
            <li>
              <a href={BOOK_MAIL} className="nav-cta" onClick={closeNav}>
                Book gennemgang →
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div className="budr-landing-content">
        {/* 1. KORT FORTALT — øverst */}
        <section
          className="intro-section intro-section--lead fi"
          id="hvad-er-budr"
          aria-label="Hvad er BUDR Care"
        >
          <div className="shell">
            <div className="intro-head">
              <div className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>
                Kort fortalt
              </div>
              <h2 className="section-h" style={{ maxWidth: 'none', margin: '0 auto' }}>
                Hvad er <em>BUDR Care?</em>
              </h2>
              <p className="intro-lead">
                BUDR Care er en produktfamilie til <strong>socialpsykiatriske botilbud</strong>:
                borger-appen <strong>Lys</strong> og <strong>Care Portal</strong> til pædagoger og
                ledere. Det er ét sammenhængende økosystem — ikke to leverandører, der skal
                integreres bag efter.
              </p>
            </div>
            <div className="intro-grid">
              <div className="intro-card">
                <div className="intro-card-ic" aria-hidden>
                  <IconSyncSend size={22} className="landing-icon" />
                </div>
                <div className="intro-card-label">Helhed</div>
                <h3 className="intro-card-h">Ét flow fra borger til journal</h3>
                <p className="intro-card-p">
                  Lys og portal deler logik og data, så signaler fra borgeren kan blive til
                  overblik, varsler og journalstøtte hos jer — uden telefonkæder og
                  dobbeltregistrering.
                </p>
                <a className="intro-card-link" href="#losning" onClick={closeNav}>
                  Se Lys og portal →
                </a>
              </div>
              <div className="intro-card">
                <div className="intro-card-ic" aria-hidden>
                  <IconPhoneCheckin size={22} className="landing-icon" />
                </div>
                <div className="intro-card-label">Borgeren</div>
                <h3 className="intro-card-h">Lys</h3>
                <p className="intro-card-p">
                  En tryg indgang til tjek-in, humør og egne ord — designet til autonomi, samtykke
                  og hverdagsrytme på bostedet.
                </p>
                <Link className="intro-card-link" href="/app" onClick={closeNav}>
                  Åbn Lys →
                </Link>
              </div>
              <div className="intro-card">
                <div className="intro-card-ic" aria-hidden>
                  <IconMonitorPortal size={22} className="landing-icon" />
                </div>
                <div className="intro-card-label">Personalet</div>
                <h3 className="intro-card-h">Care Portal</h3>
                <p className="intro-card-p">
                  Dagligt overblik, opgaver, dokumentation og medicin ét sted — bygget til
                  vagtskifte, overdragelse og fælles beslutninger i teamet.
                </p>
                <Link className="intro-card-link" href="/care-portal-demo" onClick={closeNav}>
                  Prøv portal-demo →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 2. HERO */}
        <section className="hero hero--after-intro">
          <div className="hero-bg" aria-hidden />
          <div className="hero-inner shell">
            <div>
              <h1>
                Tryghed, borgeren kan mærke. <em>Overblik, personalet kan handle på.</em>
              </h1>
              <p className="hero-sub">
                Borgerne tjekker ind i Lys, når det passer dem — teamet får et samlet overblik i
                Care Portal.{' '}
                <strong>
                  Så I kan møde dagen proaktivt — ikke først, når noget er løbet af sporet.
                </strong>
              </p>
              <div className="hero-actions">
                <a href={BOOK_MAIL} className="btn-primary">
                  Book en gennemgang
                </a>
                <Link href="/app" className="btn-ghost">
                  Hvad er Lys?
                </Link>
              </div>
              <div className="hero-track" aria-label="Vælg hvordan du vil læse siden">
                <span className="hero-track-label">Hvordan vil du læse?</span>
                <div className="hero-track-links">
                  <a href="#hurtig-oversigt" className="hero-track-link">
                    Ca. 2 minutter
                  </a>
                  <span className="hero-track-sep" aria-hidden>
                    |
                  </span>
                  <a href="#problem-losning" className="hero-track-link hero-track-link--primary">
                    Fuld gennemgang
                  </a>
                </div>
              </div>
            </div>

            <div className="portal-hero-mock" aria-label="Illustration: dagsoverblik i Care Portal">
              <div className="pmh-top">
                <span className="pmh-title">Care Portal · Dagsoverblik</span>
                <span className="pmh-date">I dag · 08:12</span>
              </div>
              <div className="pmh-tabs">
                <div className="pmh-tab active">Alle beboere</div>
                <div className="pmh-tab">Kræver opmærksomhed</div>
                <div className="pmh-tab">Medicin &amp; plan</div>
              </div>
              <div className="res-item">
                <div className="res-dot d-green" />
                <span className="res-name">
                  <ResidentInitialsAbbr initials="TV" fullName="Thomas Vang" />
                </span>
                <span className="res-mood res-mood-with-ic">
                  <IconCheck size={12} className="landing-icon landing-icon--inline" />
                  Morgentjek
                </span>
                <span className="res-time">07:48</span>
              </div>
              <div className="res-item">
                <div className="res-dot d-amber" />
                <span className="res-name">
                  <ResidentInitialsAbbr initials="CF" fullName="Camilla Frost" />
                </span>
                <span className="res-mood">Lys: angst</span>
                <span className="res-time">08:05</span>
              </div>
              <div className="res-item">
                <div className="res-dot d-red" />
                <span className="res-name">
                  <ResidentInitialsAbbr initials="JM" fullName="Jakob Møller" />
                </span>
                <span className="res-mood">Intet tjek</span>
                <span className="res-time">—</span>
              </div>
              <div className="pmh-alert">
                <IconWarning size={16} className="landing-icon landing-icon--warn icon-flex-none" />
                <span>
                  <ResidentInitialsAbbr initials="CF" fullName="Camilla Frost" /> har markeret angst
                  i Lys — anbefalet opfølgning før kl. 09
                </span>
              </div>
              <div className="pmh-sep" />
              <div className="pmh-stat-row">
                <div className="pmh-stat">
                  <div className="pmh-stat-n">9</div>
                  <div className="pmh-stat-l">Tjekket ind</div>
                </div>
                <div className="pmh-stat">
                  <div className="pmh-stat-n">2</div>
                  <div className="pmh-stat-l">Kræver dig</div>
                </div>
                <div className="pmh-stat">
                  <div className="pmh-stat-n">1</div>
                  <div className="pmh-stat-l">Uden kontakt</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="hurtig-oversigt fi"
          id="hurtig-oversigt"
          aria-label="Hurtig oversigt på få minutter"
        >
          <div className="shell">
            <h2 className="hurtig-oversigt-h">På 2 minutter</h2>
            <ul className="hurtig-oversigt-list">
              <li>
                <strong>BUDR Care</strong> er borger-appen <strong>Lys</strong> plus{' '}
                <strong>Care Portal</strong> for personalet — ét økosystem til socialpsykiatriske
                botilbud, ikke to systemer, der skal tapes sammen.
              </li>
              <li>
                Borgeren tjekker ind i Lys; teamet ser{' '}
                <strong>trafiklys og varsler i realtid</strong>, får <strong>AI-støtte</strong> til
                journal, plan og faglig sparring — og I <strong>godkender alt</strong>, før det
                låses.
              </li>
              <li>
                <a href={BOOK_MAIL}>Book en gennemgang</a>
                {' · '}
                <Link href="/care-portal-demo">Prøv Care Portal-demo</Link>
                {' · '}
                <Link href="/app">Se Lys</Link>
              </li>
            </ul>
          </div>
        </section>

        <div id="problem-losning" className="problem-losning-arc">
          {/* 3a. PROBLEM */}
          <section className="switch-section fi" id="problem">
            <div className="shell">
              <div className="eyebrow">Uden det rigtige overblik</div>
              <h2 className="section-h">
                Dagen bevæger sig hurtigt. <em>Signalerne forsvinder i støjen.</em>
              </h2>
              <div className="pain-list" style={{ marginTop: 28 }}>
                <div className="pain-item">
                  <div className="pain-icon">
                    <IconMoodSignal size={22} className="landing-icon" />
                  </div>
                  <div className="pain-text">
                    <strong>Borgerens humør ændrer sig</strong> — men personalet ved det først ved
                    samtalen.
                  </div>
                </div>
                <div className="pain-item">
                  <div className="pain-icon">
                    <IconDocMemory size={22} className="landing-icon" />
                  </div>
                  <div className="pain-text">
                    <strong>Dokumentation sker på hukommelsen</strong> — ikke i øjeblikket.
                  </div>
                </div>
                <div className="pain-item">
                  <div className="pain-icon">
                    <IconShiftGap size={22} className="landing-icon" />
                  </div>
                  <div className="pain-text">
                    <strong>Videndeling stopper</strong>, når vagtplanen skifter.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3b. LØSNING — Ét øjeblik, to overflader */}
          <section className="lys-section fi" id="losning">
            <div className="shell">
              <div style={{ textAlign: 'center', maxWidth: '40rem', margin: '0 auto 40px' }}>
                <div className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>
                  To produkter
                </div>
                <h2 className="section-h" style={{ maxWidth: 'none', margin: '0 auto' }}>
                  Ét øjeblik. <em>To overflader.</em>
                </h2>
                <p className="intro-lead" style={{ marginTop: 14 }}>
                  Lys er borgerens trygge indgang til at sige til i hverdagen. Care Portal er
                  personalets arbejdsflade — overblik, varsler og journalstøtte. BUDR holder de to
                  synkroniseret, så stemmen fra Lys bliver til handling og dokumentation hos jer.
                </p>
              </div>
              <div className="lys-grid lys-sync-grid">
                <div className="lys-mock-wrap lys-sync-source">
                  <div className="lys-hdr">
                    <div className="lys-av">L</div>
                    <div>
                      <div className="lys-nm">Lys</div>
                      <div className="lys-st">● Check-in</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--fog)' }}>
                      08:05
                    </div>
                  </div>
                  <div className="chat-b user">Jeg starter dagen — lidt tung energi.</div>
                  <div className="chat-b ai">Tak for at sige til. Hvad fylder mest lige nu?</div>
                  <div className="chat-notif">
                    <IconSyncSend size={16} className="landing-icon icon-flex-none" />
                    <span>Tjek sendt til Care Portal</span>
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: '0.68rem',
                      color: 'var(--fog)',
                      marginBottom: 5,
                    }}
                  >
                    Humør · energi · egne ord
                  </div>
                  <div className="energy-bar">
                    <div className="e-seg" style={{ background: '#e8874a' }} />
                    <div
                      className="e-seg"
                      style={{
                        background: 'var(--amber)',
                        boxShadow: '0 0 7px rgba(233,170,71,.5)',
                      }}
                    />
                    <div className="e-seg" style={{ background: 'rgba(255,255,255,.08)' }} />
                    <div className="e-seg" style={{ background: 'rgba(255,255,255,.08)' }} />
                    <div className="e-seg" style={{ background: 'rgba(255,255,255,.08)' }} />
                  </div>
                </div>
                <div className="lys-sync-bridge" aria-hidden="true">
                  <span className="lys-sync-arrow">→</span>
                  <div className="lys-sync-line">
                    <span className="lys-sync-dot" />
                  </div>
                  <span className="lys-sync-caption">Samme hændelse</span>
                </div>
                <div className="portal-hero-mock lys-sync-target" style={{ maxWidth: '100%' }}>
                  <div className="pmh-top">
                    <span className="pmh-title">Care Portal</span>
                    <span className="pmh-date">Realtime</span>
                  </div>
                  <div className="res-item lys-portal-highlight">
                    <div className="res-dot d-amber" />
                    <span className="res-name">
                      <ResidentInitialsAbbr initials="CF" fullName="Camilla Frost" />
                    </span>
                    <span className="res-mood">Lys · tung energi</span>
                    <span className="res-time">08:05</span>
                  </div>
                  <div className="res-item">
                    <div className="res-dot d-green" />
                    <span className="res-name">
                      <ResidentInitialsAbbr initials="TV" fullName="Thomas Vang" />
                    </span>
                    <span className="res-mood">OK</span>
                    <span className="res-time">07:48</span>
                  </div>
                  <div className="pmh-alert lys-alert-pulse">
                    <IconWarning
                      size={16}
                      className="landing-icon landing-icon--warn icon-flex-none"
                    />
                    <span>
                      Prioritér samtale ·{' '}
                      <ResidentInitialsAbbr initials="CF" fullName="Camilla Frost" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="lys-flow-showcase">
                <p className="sr-only">
                  Illustration: et check-in i Lys sendes gennem BUDR og vises i Care Portal med det
                  samme. Gentages som loop.
                </p>
                <p className="lys-flow-label" aria-hidden="true">
                  Sådan flyder signalet
                </p>
                <div className="lys-flow-track" aria-hidden="true">
                  <div className="lys-flow-node n1">
                    <span className="lys-flow-ring" />
                    <span className="lys-flow-name">Lys</span>
                    <span className="lys-flow-hint">Check-in</span>
                  </div>
                  <div className="lys-flow-connector-wrap">
                    <div className="lys-flow-connector c1" />
                  </div>
                  <div className="lys-flow-node n2">
                    <span className="lys-flow-ring" />
                    <span className="lys-flow-name">BUDR</span>
                    <span className="lys-flow-hint">Realtime</span>
                  </div>
                  <div className="lys-flow-connector-wrap">
                    <div className="lys-flow-connector c2" />
                  </div>
                  <div className="lys-flow-node n3">
                    <span className="lys-flow-ring" />
                    <span className="lys-flow-name">Portal</span>
                    <span className="lys-flow-hint">Handling</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 3c. SOCIAL PROOF */}
        <section className="social-proof-section fi" id="social-proof" aria-label="Udtalelser">
          <div className="shell">
            <div className="social-proof-grid">
              <div className="t-card">
                <p className="t-text">
                  Borgerne fortæller os meget mere nu — og vi opdager det, inden det eskalerer.
                </p>
                <div className="t-author">
                  Socialpsykiatrisk pædagog · botilbud · Region Midtjylland
                </div>
              </div>
              <div className="t-card">
                <p className="t-text">
                  Vi har sparet betydelig tid på dokumentation siden vi tog BUDR i brug.
                </p>
                <div className="t-author">Leder · socialpsykiatrisk botilbud · Nordjylland</div>
              </div>
            </div>
            <div className="social-proof-logos" aria-hidden>
              <span>Botilbud · Midtjylland</span>
              <span>Botilbud · Nordjylland</span>
              <span>Pilot · socialpsykiatri</span>
            </div>
          </div>
        </section>

        <div className="section-cta-band fi" aria-label="Næste skridt">
          <div className="shell section-cta-band-inner">
            <p className="section-cta-band-text">
              <strong>Godt med stemmer fra kolleger</strong> — næste skridt er at møde løsningen.
              Book en gennemgang eller prøv demoerne, når det passer jer.
            </p>
            <div className="section-cta-actions">
              <a href={BOOK_MAIL} className="btn-primary">
                Book gennemgang
              </a>
              <Link href="/care-portal-demo" className="btn-ghost" onClick={closeNav}>
                Prøv demo
              </Link>
            </div>
          </div>
        </div>

        {/* 4. SAMMENLIGNING (navngivne konkurrenter) */}
        <section
          className="comparison-section fi"
          id="sammenligning"
          aria-label="Sammenligning med Planner4You, CitizenOne m.fl."
        >
          <div className="shell">
            <div style={{ textAlign: 'center', maxWidth: '46rem', margin: '0 auto' }}>
              <div className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>
                Konkurrenter
              </div>
              <h2 className="section-h" style={{ maxWidth: 'none', margin: '0 auto' }}>
                Standardsvask eller <em>guldbehandling?</em>
              </h2>
              <p className="section-p" style={{ marginTop: 14 }}>
                <strong>BUDR Care</strong> er &quot;guldprogrammet&quot; i forhold til klassisk
                journal og drift: borger-app, realtid, AI med godkendelse og kriseplan hos borgeren.
                De andre kolonner er typiske stærke systemer — primært til personalet.
              </p>
            </div>
            <ul className="comp-teaser">
              <li>
                <strong>Lys</strong> som dedikeret borger-app — ikke bare mobil adgang til journal.
              </li>
              <li>
                <strong>Realtid + AI</strong> (journal, plan, sparring) med jeres godkendelse før
                udgivelse.
              </li>
              <li>
                <strong>Fuld tabel</strong> med Planner4You og CitizenOne — åbn herunder når I vil i
                dybden.
              </li>
            </ul>
            <details className="comp-full-details" id="fuld-sammenligning-tabel">
              <summary>Se fuld sammenligningstabel</summary>
              <div className="comp-scroll">
                <div
                  className="comp-table"
                  role="table"
                  aria-label="Sammenligning BUDR Care, Planner4You, CitizenOne og øvrige systemer"
                >
                  <div className="comp-row hdr" role="row">
                    <div className="comp-cell" role="columnheader">
                      Funktion / fokus
                    </div>
                    <div className="comp-cell budr-c" role="columnheader">
                      <span className="comp-budr-hdr-title">BUDR Care</span>
                      <span className="comp-budr-badge">Fuld pakke</span>
                    </div>
                    <div className="comp-cell comp-col-standard" role="columnheader">
                      <span className="comp-basic-label">Typisk drift</span>
                      Planner4You
                    </div>
                    <div className="comp-cell comp-col-standard" role="columnheader">
                      <span className="comp-basic-label">Typisk journal</span>
                      CitizenOne
                    </div>
                    <div className="comp-cell comp-col-standard" role="columnheader">
                      <span className="comp-basic-label">Øvrige</span>
                      Andre systemer
                    </div>
                  </div>
                  <div className="comp-row" role="row">
                    <div className="comp-cell feat-label" role="cell">
                      <strong>Borger-app Lys</strong> — egen app til tjek-in, humør, AI-samtale og
                      kriseplan (ikke kun “mobil browser til journal”)
                    </div>
                    <div className="comp-cell budr-c" role="cell">
                      <span className="yes" aria-label="Ja, inkluderet">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="comp-na" aria-label="Ikke som dedikeret borger-app">
                        —
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="comp-na" aria-label="Ikke som dedikeret borger-app">
                        —
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="comp-na" aria-label="Sjældent">
                        —
                      </span>
                    </div>
                  </div>
                  <div className="comp-row" role="row">
                    <div className="comp-cell feat-label" role="cell">
                      <strong>Realtid</strong> fra borgerens handling i Lys til trafiklys og opgaver
                      i Care Portal — uden telefonkæde
                    </div>
                    <div className="comp-cell budr-c" role="cell">
                      <span className="yes" aria-label="Ja">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="comp-na" aria-label="Ikke samme flow">
                        —
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="comp-na" aria-label="Ikke samme flow">
                        —
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="part">Delvis</span>
                    </div>
                  </div>
                  <div className="comp-row" role="row">
                    <div className="comp-cell feat-label" role="cell">
                      <strong>AI-journal &amp; plan</strong> som udkast med{' '}
                      <strong>krav om faglig godkendelse</strong>, før noget låses
                    </div>
                    <div className="comp-cell budr-c" role="cell">
                      <span className="yes" aria-label="Ja">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="comp-na" aria-label="Nej">
                        —
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="comp-na" aria-label="Nej">
                        —
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="part">Varierer</span>
                    </div>
                  </div>
                  <div className="comp-row" role="row">
                    <div className="comp-cell feat-label" role="cell">
                      <strong>AI-faglig sparring</strong> til personalet i portalen (hurtig
                      kollega-lignende støtte i hverdagen)
                    </div>
                    <div className="comp-cell budr-c" role="cell">
                      <span className="yes" aria-label="Ja">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="comp-na" aria-label="Nej">
                        —
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="comp-na" aria-label="Nej">
                        —
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="comp-na" aria-label="Nej">
                        —
                      </span>
                    </div>
                  </div>
                  <div className="comp-row" role="row">
                    <div className="comp-cell feat-label" role="cell">
                      <strong>Kriseplan &amp; beredskab</strong> struktureret{' '}
                      <strong>hos borgeren</strong> i Lys — synligt for teamet i portalen
                    </div>
                    <div className="comp-cell budr-c" role="cell">
                      <span className="yes" aria-label="Ja">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="comp-na" aria-label="Nej">
                        —
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="comp-na" aria-label="Nej">
                        —
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="comp-na" aria-label="Nej">
                        —
                      </span>
                    </div>
                  </div>
                  <div className="comp-row" role="row">
                    <div className="comp-cell feat-label" role="cell">
                      <strong>Varsler</strong> der prioriterer “kræver dig først” — mindre støj fra
                      generiske påmindelser
                    </div>
                    <div className="comp-cell budr-c" role="cell">
                      <span className="yes" aria-label="Ja">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="part">Delvis</span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="part">Delvis</span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="part">Delvis</span>
                    </div>
                  </div>
                  <div className="comp-row" role="row">
                    <div className="comp-cell feat-label" role="cell">
                      <strong>Ét økosystem</strong> — Lys og Care Portal designet og leveret som ét
                      forløb til socialpsykiatriske botilbud
                    </div>
                    <div className="comp-cell budr-c" role="cell">
                      <span className="yes" aria-label="Ja">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="part">Modulpakke</span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="part">Journal-suite</span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="part">Fragmenteret</span>
                    </div>
                  </div>
                  <div className="comp-row" role="row">
                    <div className="comp-cell feat-label" role="cell">
                      <strong>Journal, medicin, dokumentation</strong> og fagligt overblik over
                      beboere (baseline “vasken”)
                    </div>
                    <div className="comp-cell budr-c" role="cell">
                      <span className="yes" aria-label="Ja">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="yes" aria-label="Ja">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="yes" aria-label="Ja">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="part">Delvis</span>
                    </div>
                  </div>
                  <div className="comp-row" role="row">
                    <div className="comp-cell feat-label" role="cell">
                      <strong>Vagtplan, møder, kalender</strong> og klassisk drift på gulvet
                    </div>
                    <div className="comp-cell budr-c" role="cell">
                      <span className="part">Fokus portal</span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="yes" aria-label="Stærkt">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="yes" aria-label="Stærkt">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="part">Varierer</span>
                    </div>
                  </div>
                  <div className="comp-row" role="row">
                    <div className="comp-cell feat-label" role="cell">
                      <strong>Åben demo</strong> af både borgerflow (Lys) og portal uden
                      købsforpligtelse
                    </div>
                    <div className="comp-cell budr-c" role="cell">
                      <span className="yes" aria-label="Ja">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="part">Ofte personale</span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="yes" aria-label="Ja">
                        ✓
                      </span>
                    </div>
                    <div className="comp-cell" role="cell">
                      <span className="part">Varierer</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="comparison-footnote">
                <strong>Om borger-app:</strong> Planner4You beskriver bl.a. trivselsvurdering med
                borgerinddragelse — det er ikke det samme som en dedikeret borger-companion som Lys.
                CitizenOne fremhæver journal, medicin og mobil adgang til <em>personalets</em>{' '}
                arbejde. Planner4You og CitizenOne er tredjeparter med egne vilkår. Tabellen er
                BUDRs fortolkning og erstatter ikke udbud eller DPA — kontakt os for gennemgang af
                pasform.
              </p>
            </details>
          </div>
        </section>

        <div className="section-cta-band fi" aria-label="Efter sammenligning">
          <div className="shell section-cta-band-inner">
            <p className="section-cta-band-text">
              Tabellen er overskrifter — <strong>book en gennemgang</strong>, hvis I vil dykke ned i
              pasform og sikkerhed.
            </p>
            <div className="section-cta-actions">
              <a href={BOOK_MAIL} className="btn-primary">
                Book gennemgang
              </a>
              <a href="#fuld-sammenligning-tabel" className="btn-ghost">
                Åbn tabel igen
              </a>
            </div>
          </div>
        </div>

        {/* Samlede højdepunkter (tidligere fordele + smart-funktioner) */}
        <section className="usp-section fi" id="fordele" aria-label="Højdepunkter ved BUDR Care">
          <div className="shell">
            <div className="usp-head">
              <div className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>
                Det I får med
              </div>
              <h2
                className="section-h"
                style={{ textAlign: 'center', maxWidth: '44rem', margin: '0 auto' }}
              >
                Én <em>fuld pakke</em> — ikke bare journal
              </h2>
              <p
                className="section-p"
                style={{ textAlign: 'center', maxWidth: '38rem', margin: '14px auto 0' }}
              >
                Kerneforskelle samlet — uden at gentage hele funktionslisten længere nede på siden.
              </p>
            </div>
            <div className="usp-grid usp-grid--six">
              <div className="usp-card">
                <div className="usp-icon-wrap">
                  <IconUspRealtime size={22} className="landing-icon" />
                </div>
                <h3 className="usp-card-h">Realtid fra Lys til portal</h3>
                <p className="usp-card-p">
                  Check-in og stemning hos borgeren bliver til trafiklys og opgaver hos jer med det
                  samme — uden telefonkæder eller mellemnotater.
                </p>
              </div>
              <div className="usp-card">
                <div className="usp-icon-wrap">
                  <IconTeam size={22} className="landing-icon" />
                </div>
                <h3 className="usp-card-h">AI med kontrol</h3>
                <p className="usp-card-p">
                  Journal- og planforslag samt <strong>faglig sparring i portalen</strong> — alt som
                  udkast, indtil personalet eller lederen godkender.
                </p>
              </div>
              <div className="usp-card">
                <div className="usp-icon-wrap">
                  <IconShield size={22} className="landing-icon" />
                </div>
                <h3 className="usp-card-h">Kriseplan &amp; varsler</h3>
                <p className="usp-card-p">
                  Beredskab struktureret <strong>hos borgeren i Lys</strong>, synligt for teamet —
                  og varsler der prioriterer det, der kræver jer først.
                </p>
              </div>
              <div className="usp-card">
                <div className="usp-icon-wrap">
                  <IconUspOneTruth size={22} className="landing-icon" />
                </div>
                <h3 className="usp-card-h">Én fælles virkelighed</h3>
                <p className="usp-card-p">
                  Samme overblik efter vagtskifte og ved overdragelse — mindre &quot;hvem vidste
                  hvad?&quot;, mere tid til borgeren.
                </p>
              </div>
              <div className="usp-card">
                <div className="usp-icon-wrap">
                  <IconUspBotilbud size={22} className="landing-icon" />
                </div>
                <h3 className="usp-card-h">Bygget til botilbud</h3>
                <p className="usp-card-p">
                  Domæne for socialpsykiatrien — og I kan <strong>prøve demo</strong> af portal og
                  Lys uden binding, før I beslutter.
                </p>
              </div>
              <div className="usp-card">
                <div className="usp-icon-wrap">
                  <IconUspTrust size={22} className="landing-icon" />
                </div>
                <h3 className="usp-card-h">Tryg datahåndtering</h3>
                <p className="usp-card-p">
                  GDPR, samtykke og klare rammer — designet sammen med fagpersoner på gulvet.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="section-cta-band fi" aria-label="Videre til funktioner">
          <div className="shell section-cta-band-inner">
            <p className="section-cta-band-text">
              Herunder går vi <strong>i dybden med funktionerne</strong> — eller book og få det vist
              live.
            </p>
            <div className="section-cta-actions">
              <a href={BOOK_MAIL} className="btn-primary">
                Book gennemgang
              </a>
              <Link href="#features" className="btn-ghost" onClick={closeNav}>
                Se funktionslisten
              </Link>
            </div>
          </div>
        </div>

        {/* 5. SÅDAN VIRKER DET */}
        <section className="flow-section fi" id="sadan-virker-det" aria-label="Sådan virker det">
          <div className="shell">
            <div className="flow-head">
              <div className="eyebrow">Processen</div>
              <h2 className="section-h">
                Fra check-in til handling <em>på under 5 minutter</em>
              </h2>
            </div>
            <div className="flow-steps">
              <div className="flow-step">
                <div className="flow-emoji" aria-hidden>
                  <IconPhoneCheckin size={28} className="landing-icon" />
                </div>
                <div className="flow-num">1</div>
                <div className="flow-h">Borgeren åbner Lys og tjekker ind</div>
                <p className="flow-p">
                  Humør, tanker, energi — struktureret, så personalet forstår.
                </p>
              </div>
              <div className="flow-step">
                <div className="flow-emoji" aria-hidden>
                  <IconMonitorPortal size={28} className="landing-icon" />
                </div>
                <div className="flow-num">2</div>
                <div className="flow-h">Care Portal opdateres i realtid</div>
                <p className="flow-p">Ingen manuel overførsel mellem systemer.</p>
              </div>
              <div className="flow-step">
                <div className="flow-emoji" aria-hidden>
                  <IconCareAction size={28} className="landing-icon" />
                </div>
                <div className="flow-num">3</div>
                <div className="flow-h">Personalet handler med det samme</div>
                <p className="flow-p">Eller følger op ved næste planlagte møde.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5b. Interaktiv mini-demo: Lys check-in → portal-notifikation */}
        <section className="live-demo-strip fi" id="prover-selv" aria-label="Prøv flowet selv">
          <div className="shell">
            <div className="live-demo-head">
              <div className="eyebrow">Interaktivt</div>
              <h2 className="section-h">
                Prøv et <em>check-in</em> — se portalen reagere
              </h2>
              <p className="section-p live-demo-lead">
                Udfyld humør, energi og hvad der fylder — tilføj evt. en bemærkning — og send til
                Care Portal. Til højre ser I, hvordan dagsoverblikket og beskeden til personalet
                ændrer sig efter jeres valg, som i rigtig drift.
              </p>
            </div>
            <LandingInteractiveDemo />
          </div>
        </section>

        {/* 6. FEATURES */}
        <section className="portal-section fi" id="features">
          <div className="shell">
            <div className="portal-grid">
              <div>
                <div className="eyebrow">I portalen</div>
                <h2 className="section-h">
                  Overblik, dokumentation, <em>trafiklys</em> — ét sted
                </h2>
                <p className="section-p">
                  Dagsoverblik pr. beboer,{' '}
                  <strong>AI der kan sparre jer igennem konkrete situationer</strong>, journal- og
                  planudkast I godkender, medicin og profil samlet, varsler fra Lys og manglende
                  tjek — og hos borgeren struktur til <strong>krise og beredskab</strong> i appen.
                  Plus søgning på tværs, roller der matcher jeres team, og ét sted at handle, når
                  noget brænder.
                </p>
                <div className="feature-pills">
                  <div className="fpill">
                    <div className="fpill-icon">
                      <IconOverviewGrid size={20} className="landing-icon" />
                    </div>
                    <div>
                      <div className="fpill-title">Dagsoverblik</div>
                      <div className="fpill-desc">
                        Hvem er ok, hvem kræver øje — sorteret efter behov.
                      </div>
                    </div>
                  </div>
                  <div className="fpill">
                    <div className="fpill-icon">
                      <IconJournal size={20} className="landing-icon" />
                    </div>
                    <div>
                      <div className="fpill-title">Dokumentation</div>
                      <div className="fpill-desc">Udkast fra personalet og Lys — I godkender.</div>
                    </div>
                  </div>
                  <div className="fpill">
                    <div className="fpill-icon">
                      <IconTraffic size={20} className="landing-icon" />
                    </div>
                    <div>
                      <div className="fpill-title">Trafiklys &amp; varsler</div>
                      <div className="fpill-desc">Se det kritiske først — uden støj.</div>
                    </div>
                  </div>
                  <div className="fpill">
                    <div className="fpill-icon">
                      <IconMedicine size={20} className="landing-icon" />
                    </div>
                    <div>
                      <div className="fpill-title">Medicin &amp; profil</div>
                      <div className="fpill-desc">Færre skift mellem skærme.</div>
                    </div>
                  </div>
                  <div className="fpill">
                    <div className="fpill-icon">
                      <IconPlanCheck size={20} className="landing-icon" />
                    </div>
                    <div>
                      <div className="fpill-title">Planforslag</div>
                      <div className="fpill-desc">AI foreslår — intet uden jeres ok.</div>
                    </div>
                  </div>
                  <div className="fpill">
                    <div className="fpill-icon">
                      <IconTeam size={20} className="landing-icon" />
                    </div>
                    <div>
                      <div className="fpill-title">AI-sparring til personalet</div>
                      <div className="fpill-desc">
                        Svar og idéer til konkrete udfordringer — som hurtig faglig kollega-hjælp.
                      </div>
                    </div>
                  </div>
                  <div className="fpill">
                    <div className="fpill-icon">
                      <IconShield size={20} className="landing-icon" />
                    </div>
                    <div>
                      <div className="fpill-title">Krise &amp; beredskab (Lys)</div>
                      <div className="fpill-desc">
                        Tryg struktur hos borgeren, så planen er tilgængelig, når den bruges.
                      </div>
                    </div>
                  </div>
                  <div className="fpill">
                    <div className="fpill-icon">
                      <IconSearchDoc size={20} className="landing-icon" />
                    </div>
                    <div>
                      <div className="fpill-title">Søgning i dokumentation</div>
                      <div className="fpill-desc">
                        Find notater og journal hurtigt — mindre jagt i mapper.
                      </div>
                    </div>
                  </div>
                  <div className="fpill">
                    <div className="fpill-icon">
                      <IconRoles size={20} className="landing-icon" />
                    </div>
                    <div>
                      <div className="fpill-title">Roller &amp; adgang</div>
                      <div className="fpill-desc">
                        Kun det, personalet og lederen skal se — tilpasset jeres enhed.
                      </div>
                    </div>
                  </div>
                  <div className="fpill">
                    <div className="fpill-icon">
                      <IconUspOneTruth size={20} className="landing-icon" />
                    </div>
                    <div>
                      <div className="fpill-title">Mindre dobbeltarbejde</div>
                      <div className="fpill-desc">
                        Ét sted at handle — færre gentagelser mellem systemer og personalet.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="portal-screen fi fi-d1">
                <div className="ps-bar">
                  <div className="ps-dots">
                    <div className="ps-dot" style={{ background: '#e05555' }} />
                    <div className="ps-dot" style={{ background: '#e8a847' }} />
                    <div className="ps-dot" style={{ background: '#3cbf70' }} />
                  </div>
                  <div className="ps-url">care.budr.dk</div>
                </div>
                <div className="ps-body">
                  <div className="ps-sidebar">
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--fog)',
                        fontWeight: 600,
                        marginBottom: 12,
                        padding: '0 4px',
                      }}
                    >
                      BUDR
                    </div>
                    <div className="ps-nav-item active">
                      <IconOverviewGrid size={14} className="landing-icon ps-nav-ic" />
                      Dagsoverblik
                    </div>
                    <div className="ps-nav-item">
                      <IconUser size={14} className="landing-icon ps-nav-ic" />
                      Beboere
                    </div>
                    <div className="ps-nav-item">
                      <IconJournal size={14} className="landing-icon ps-nav-ic" />
                      Journal
                    </div>
                    <div className="ps-nav-item">
                      <IconMedicine size={14} className="landing-icon ps-nav-ic" />
                      Medicin
                    </div>
                    <div className="ps-nav-item">
                      <IconAlertBell size={14} className="landing-icon ps-nav-ic" />
                      Varsler
                    </div>
                  </div>
                  <div className="ps-main">
                    <div className="ps-main-title">Dagsoverblik · 12 beboere</div>
                    <div className="ps-col-h">
                      <span />
                      <span>Initialer</span>
                      <span>Status</span>
                      <span>Signal</span>
                      <span>Siden</span>
                    </div>
                    <div className="ps-res-row">
                      <div className="res-dot d-green" />
                      <span>
                        <ResidentInitialsAbbr initials="TV" fullName="Thomas Vang" />
                      </span>
                      <span className="ps-badge badge-ok">Rolig</span>
                      <span className="ps-note">OK</span>
                      <span className="ps-note">07:48</span>
                    </div>
                    <div className="ps-res-row">
                      <div className="res-dot d-amber" />
                      <span>
                        <ResidentInitialsAbbr initials="CF" fullName="Camilla Frost" />
                      </span>
                      <span className="ps-badge badge-warn">Opmærksom</span>
                      <span className="ps-note">Lys</span>
                      <span className="ps-note">08:05</span>
                    </div>
                    <div className="ps-res-row">
                      <div className="res-dot d-red" />
                      <span>
                        <ResidentInitialsAbbr initials="JM" fullName="Jakob Møller" />
                      </span>
                      <span className="ps-badge badge-crit">Intet tjek</span>
                      <span className="ps-note">—</span>
                      <span className="ps-note">—</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="section-cta-band fi" aria-label="Efter funktionsliste">
          <div className="shell section-cta-band-inner">
            <p className="section-cta-band-text">
              Klar til næste skridt? <strong>Book gennemgang</strong> eller prøv{' '}
              <strong>demoerne</strong> — eller læs om data og retssikkerhed herunder.
            </p>
            <div className="section-cta-actions">
              <a href={BOOK_MAIL} className="btn-primary">
                Book gennemgang
              </a>
              <Link href="/care-portal-demo" className="btn-ghost" onClick={closeNav}>
                Prøv demo
              </Link>
            </div>
          </div>
        </div>

        {/* 7. TRYGHED */}
        <section className="tryghed-section fi" id="tryghed">
          <div className="shell">
            <div className="eyebrow">Data &amp; retssikkerhed</div>
            <h2 className="section-h">
              Bygget til <em>dansk socialpsykiatri</em>
            </h2>
            <div className="pain-list" style={{ marginTop: 28 }}>
              <div className="pain-item">
                <div className="pain-icon">
                  <IconShield size={22} className="landing-icon" />
                </div>
                <div className="pain-text">
                  <strong>GDPR-compliant</strong> — data behandles efter dansk og europæisk
                  lovgivning.
                </div>
              </div>
              <div className="pain-item">
                <div className="pain-icon">
                  <IconLock size={22} className="landing-icon" />
                </div>
                <div className="pain-text">
                  <strong>Persondata forlader aldrig platformen</strong> uden samtykke.
                </div>
              </div>
              <div className="pain-item">
                <div className="pain-icon">
                  <IconTeam size={22} className="landing-icon" />
                </div>
                <div className="pain-text">
                  <strong>Udformet i tæt samarbejde</strong> med fagpersonale fra botilbud.
                </div>
              </div>
            </div>
            <p className="section-p" style={{ marginTop: 24 }}>
              <Link href="/privacy">Læs privatlivspolitikken →</Link>
            </p>
          </div>
        </section>

        {/* 8. SEKUNDÆR CTA */}
        <section className="cta-section">
          <div className="cta-bg" aria-hidden />
          <div style={{ position: 'relative', zIndex: 1 }} className="fi">
            <h2>Klar til at se det i praksis?</h2>
            <p className="cta-lead">
              Book en uforpligtende gennemgang — eller prøv demoerne, når det passer jer.
            </p>
            <div className="cta-actions">
              <a href={BOOK_MAIL} className="btn-primary">
                Book en uforpligtende gennemgang
              </a>
              <Link href="/care-portal-demo" className="btn-ghost">
                Prøv demoerne selv
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
                Portal til personalet. Lys til borgeren. Socialpsykiatri og botilbud.
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
              <h5>På siden</h5>
              <a href="#hvad-er-budr">Om BUDR</a>
              <a href="#hurtig-oversigt">Hurtig oversigt</a>
              <a href="#problem-losning">Problem &amp; løsning</a>
              <a href="#sammenligning">Sammenligning</a>
              <a href="#fordele">Højdepunkter</a>
              <a href="#sadan-virker-det">Sådan virker det</a>
              <a href="#features">Funktioner</a>
              <a href="#tryghed">Tryghed</a>
              <a href="#prover-selv">Prøv demo</a>
              <a
                href="https://www.linkedin.com/company/budr"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
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

'use client';

import Link from 'next/link';
import { useEffect } from 'react';
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
  IconUspDemo,
  IconUspHumanOk,
  IconUspOneTruth,
  IconUspRealtime,
  IconUspSignal,
  IconUspTrust,
  IconUspVoice,
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

  return (
    <div className={`budr-landing ${className}`.trim()}>
      <nav>
        <div className="nav-inner shell">
          <Link href="/" className="nav-logo" aria-label="BUDR Care — forsiden">
            <BudrLogo dark size={40} />
          </Link>
          <ul className="nav-links">
            <li>
              <a href="#fordele">Fordele</a>
            </li>
            <li>
              <a href="#problem">Hverdagsudfordringer</a>
            </li>
            <li>
              <a href="#losning">Lys &amp; portal</a>
            </li>
            <li>
              <a href="#sadan-virker-det">Sådan virker det</a>
            </li>
            <li>
              <a href="#features">Funktioner</a>
            </li>
            <li>
              <a href="#tryghed">Tryghed</a>
            </li>
            <li>
              <a href="#prover-selv">Prøv demo</a>
            </li>
            <li>
              <a href={BOOK_MAIL} className="nav-cta">
                Book gennemgang →
              </a>
            </li>
          </ul>
          <a href={BOOK_MAIL} className="nav-mobile-demo">
            Book
          </a>
        </div>
      </nav>

      {/* 1. HERO */}
      <section className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="hero-inner shell">
          <div>
            <h1>
              Færre overraskelser. <em>Mere tid til borgeren.</em>
            </h1>
            <p className="hero-sub">
              Tjek-in i Lys — overblik og handling i Care Portal, i realtid.
            </p>
            <div className="hero-actions">
              <a href={BOOK_MAIL} className="btn-primary">
                Book en gennemgang
              </a>
              <Link href="/care-portal-demo" className="btn-ghost">
                Prøv Care Portal selv
              </Link>
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
                <ResidentInitialsAbbr initials="CF" fullName="Camilla Frost" /> har markeret angst i
                Lys — anbefalet opfølgning før kl. 09
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

      {/* 2. SOCIAL PROOF */}
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

      {/* 2b. USP / fordele */}
      <section className="usp-section fi" id="fordele" aria-label="Fordele ved BUDR">
        <div className="shell">
          <div className="usp-head">
            <div className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>
              Udvalgte fordele
            </div>
            <h2
              className="section-h"
              style={{ textAlign: 'center', maxWidth: '44rem', margin: '0 auto' }}
            >
              Bygget til <em>botilbud</em> — ikke generisk sundheds-IT
            </h2>
          </div>
          <div className="usp-grid">
            <div className="usp-card">
              <div className="usp-icon-wrap">
                <IconUspRealtime size={22} className="landing-icon" />
              </div>
              <h3 className="usp-card-h">Realtid mellem Lys og portal</h3>
              <p className="usp-card-p">
                Ét check-in hos borgeren bliver til signal hos jer — uden telefonkæder eller
                mellemnotater.
              </p>
            </div>
            <div className="usp-card">
              <div className="usp-icon-wrap">
                <IconUspHumanOk size={22} className="landing-icon" />
              </div>
              <h3 className="usp-card-h">Mennesket i centrum</h3>
              <p className="usp-card-p">
                AI prioriterer og foreslår — intet journalindhold uden jeres faglige godkendelse.
              </p>
            </div>
            <div className="usp-card">
              <div className="usp-icon-wrap">
                <IconUspOneTruth size={22} className="landing-icon" />
              </div>
              <h3 className="usp-card-h">Én fælles virkelighed</h3>
              <p className="usp-card-p">
                Samme overblik efter vagtskifte. Mindre &quot;hvem vidste hvad?&quot; — mere tid til
                borgeren.
              </p>
            </div>
            <div className="usp-card">
              <div className="usp-icon-wrap">
                <IconUspBotilbud size={22} className="landing-icon" />
              </div>
              <h3 className="usp-card-h">Domæne for socialpsykiatrien</h3>
              <p className="usp-card-p">
                Trafiklys, tjek, dokumentation og medicinoverblik — tilrettet hverdagen på botilbud.
              </p>
            </div>
            <div className="usp-card">
              <div className="usp-icon-wrap">
                <IconUspDemo size={22} className="landing-icon" />
              </div>
              <h3 className="usp-card-h">Prøv før I beslutter</h3>
              <p className="usp-card-p">
                Åbn demo af portal og Lys uden binding — mærk flowet på egen hånd.
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
            <div className="usp-card">
              <div className="usp-icon-wrap">
                <IconUspVoice size={22} className="landing-icon" />
              </div>
              <h3 className="usp-card-h">Fra borgerens ord til struktur</h3>
              <p className="usp-card-p">
                Stemmen fra Lys bliver til læsbare signaler og journalstøtte — ikke bare noter i
                marginen.
              </p>
            </div>
            <div className="usp-card">
              <div className="usp-icon-wrap">
                <IconUspSignal size={22} className="landing-icon" />
              </div>
              <h3 className="usp-card-h">Varsler med mening</h3>
              <p className="usp-card-p">
                I ser først det, der kræver opmærksomhed — ikke endnu en notifikationsstøj.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM */}
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

      {/* 4. LØSNING — Ét øjeblik, to overflader */}
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
                style={{ marginTop: 12, fontSize: '0.68rem', color: 'var(--fog)', marginBottom: 5 }}
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
                <IconWarning size={16} className="landing-icon landing-icon--warn icon-flex-none" />
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
              <p className="flow-p">Humør, tanker, energi — struktureret, så personalet forstår.</p>
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
              Udfyld humør, energi og hvad der fylder — tilføj evt. en bemærkning — og send til Care
              Portal. Til højre ser I, hvordan dagsoverblikket og beskeden til personalet ændrer sig
              efter jeres valg, som i rigtig drift.
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
                Dagsoverblik pr. beboer, journaludkast tæt på dagen, medicin og profil samlet,
                varsler fra Lys og manglende tjek, planforslag I godkender — plus søgning på tværs,
                roller der matcher jeres team, og ét sted at handle, når noget brænder.
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
            <a href="#fordele">Fordele</a>
            <a href="#problem">Hverdagsudfordringer</a>
            <a href="#losning">Lys &amp; portal</a>
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
  );
}

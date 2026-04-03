'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

type HomeLandingProps = {
  className?: string;
};

type RoleId =
  | 'paedagoger'
  | 'ledere'
  | 'koordinatorer'
  | 'vikarer'
  | 'vagtplan'
  | 'sagsbehandler'
  | 'borger';

type RoleBlock = {
  id: RoleId;
  label: string;
  title: string;
  lead: string;
  bullets: string[];
  demo: string;
  showLysSectionLink?: boolean;
};

const ROLE_BLOCKS: RoleBlock[] = [
  {
    id: 'paedagoger',
    label: 'For pædagoger',
    title: 'For pædagoger',
    lead: 'Hvem har brug for jer først — uden at lede i fire systemer. Når pædagogerne trives i overblikket, følger resten trop.',
    bullets: [
      'Overblik efter behov — ikke alfabetisk.',
      'Lys + morgentjek samme sted — færre “vidste du ikke …?” på gangen.',
      'Journaludkast fra dagen — mindre blank skærm og klarere overdragelse.',
    ],
    demo: 'Første minutter af vagten: prioritering, én borger, notat på vej.',
  },
  {
    id: 'ledere',
    label: 'For ledere',
    title: 'For ledere',
    lead: 'Drift og dokumentation I kan stole på — uden mailjagt. Gennemskueligt for team og omverden.',
    bullets: [
      'Hvem kræver opmærksomhed, hvor halter dokumentationen — uden KPI-støj.',
      'Sporbare hændelser: bedre samtaler med medarbejdere, pårørende og kommune.',
      'Varsler før små ting bliver store; samme sandhed for faste og vikarer.',
    ],
    demo: 'Lederoverblik: risiko, opfølgning, kommunikation ud af huset.',
  },
  {
    id: 'koordinatorer',
    label: 'For koordinatorer',
    title: 'For koordinatorer',
    lead: 'Én opdateret sandhed på tværs af vagter — ikke hver sin notesbog.',
    bullets: [
      'Planer, aftaler og opfølgning samlet.',
      'Journal, profil og praksis hænger sammen — mindre dobbeltarbejde.',
      'Klart ansvar og bedre dialog med kommune og sagsbehandler.',
    ],
    demo: 'Én borger, én uge: koordinering uden kaos.',
  },
  {
    id: 'vikarer',
    label: 'For vikarer',
    title: 'For vikarer',
    lead: 'Sygdom eller akut dækning: trygt huset hurtigt — for både nye og garvede, der ikke har daglig gang her.',
    bullets: [
      'Vagtoverblik: tryg / fokus / medicin og rutiner.',
      'Kort kontekst pr. borger — uden at læse hele sagen første time.',
      'Varsler så “stille” ikke læses som “trygt”; samme platform som faste team.',
    ],
    demo: 'Første kvarter: login → prioritering → handling.',
  },
  {
    id: 'vagtplan',
    label: 'For vagtplanlæggere',
    title: 'For vagtplanlæggere',
    lead: 'Tal på tavlen + den omsorg I mærker i huset — begge dele.',
    bullets: [
      'Se perioder med mange signaler eller skift i trivsel.',
      'Supplerer jeres vagtplan — menneskeligt overblik, ikke overvågning.',
      'Når front og plan ser det samme, bliver dialogen enklere.',
    ],
    demo: 'Hverdagssignaler som grundlag for planlægningsdialog.',
  },
  {
    id: 'sagsbehandler',
    label: 'For sagsbehandlere',
    title: 'For sagsbehandlere',
    lead: 'Klar botilbud–kommune-kommunikation gavner alle — især borgeren. Her kan BUDR skille sig ud.',
    bullets: [
      'Dokumentation tættere på praksis — mindre bilag- og mailjagt.',
      'Skel: borger (Lys), observation, faglig vurdering — læsbart i sagen.',
      'Relevant deling med GDPR og retssikkerhed; færre “hvad skete der?”-opkald.',
    ],
    demo: 'Hændelse → struktureret underlag og bedre kommunikationsflow.',
  },
  {
    id: 'borger',
    label: 'For borgere',
    title: 'For borgere',
    lead: 'Øjenhøjje, også når ordene mangler. Lys til jer; portal til personalet — samme værdige hverdag.',
    bullets: [
      'Lys: samtale, humør, små planer — når I har brug for det, døgnet rundt.',
      'Det I deler, kan hjælpe personalet at forstå jer — når I ønsker det.',
      'Typisk link og ét klik — uden app-butik og tungt login.',
    ],
    demo: 'Lys-demo + hvad personalet ser (kun det relevante).',
    showLysSectionLink: true,
  },
];

export default function HomeLanding({ className = '' }: HomeLandingProps) {
  const rolesHeadingId = useId();
  const [activeRole, setActiveRole] = useState<RoleId>('paedagoger');
  const active = ROLE_BLOCKS.find((r) => r.id === activeRole) ?? ROLE_BLOCKS[0];
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
        <Link href="/" className="nav-logo">
          <div className="logo-mark">B</div>
          BUDR Care
        </Link>
        <ul className="nav-links">
          <li>
            <a href="#portalen">Care Portal</a>
          </li>
          <li>
            <a href="#skift">Hverdag &amp; systemer</a>
          </li>
          <li>
            <a href="#hvad-kan-budr">Hvad kan BUDR?</a>
          </li>
          <li>
            <a href="#lys">Lys til borgeren</a>
          </li>
          <li>
            <a href="#om-budr">Om BUDR</a>
          </li>
          <li>
            <Link href="/care-portal-demo" className="nav-cta">
              Prøv portal →
            </Link>
          </li>
        </ul>
        <Link href="/care-portal-demo" className="nav-mobile-demo">
          Prøv portal
        </Link>
      </nav>

      <section className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="hero-inner">
          <div>
            <div className="hero-tag">
              <span aria-hidden />
              Til pædagoger og ledere · Botilbud &amp; socialpsykiatri
            </div>
            <h1>
              Journalen, medicinen og borgerens egne ord — <em>før I åbner første dør.</em>
            </h1>
            <p className="hero-sub">
              Journal efter vagt, medicin der skal stemples, oplysninger spredt på tværs af
              systemer. Care Portal samler overblikket — mere tid til borgerne, mindre til jagt.
            </p>
            <div className="hero-actions">
              <Link href="/care-portal-demo" className="btn-primary">
                Prøv portalen gratis →
              </Link>
              <a
                href="mailto:hej@budrcare.dk?subject=Demo%20af%20BUDR%20Care"
                className="btn-ghost"
              >
                Book en gennemgang
              </a>
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
              <span className="res-name">Thomas Vang</span>
              <span className="res-mood">Morgentjek ✓</span>
              <span className="res-time">07:48</span>
            </div>
            <div className="res-item">
              <div className="res-dot d-amber" />
              <span className="res-name">Camilla Frost</span>
              <span className="res-mood">Lys: angst</span>
              <span className="res-time">08:05</span>
            </div>
            <div className="res-item">
              <div className="res-dot d-red" />
              <span className="res-name">Jakob Møller</span>
              <span className="res-mood">Intet tjek</span>
              <span className="res-time">—</span>
            </div>
            <div className="pmh-alert">
              ⚠ Camilla har markeret angst i Lys — anbefalet opfølgning før kl. 09
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

      <div className="stats-bar fi">
        <div className="stats-inner">
          <div>
            <div className="stat-n">3</div>
            <div className="stat-l">Aktive botilbud i pilot</div>
          </div>
          <div>
            <div className="stat-n">&lt;5 min</div>
            <div className="stat-l">Til første rigtige overblik</div>
          </div>
          <div>
            <div className="stat-n">~2 t</div>
            <div className="stat-l">Mindre dokumentation pr. døgn*</div>
          </div>
          <div>
            <div className="stat-n">0</div>
            <div className="stat-l">Ringbind som eneste sandhed</div>
          </div>
        </div>
      </div>

      <section className="switch-section" id="skift">
        <div className="switch-grid fi">
          <div>
            <div className="eyebrow">Det I mærker hver dag</div>
            <h2 className="section-h">
              Eksisterende systemer er bygget til sager — <em>ikke til jeres vagt</em>
            </h2>
            <p className="section-p">
              Mange systemer er bygget til sager og regler — ikke til{' '}
              <em>hvem har brug for mig først?</em> BUDR tilføjer borgerens signaler og et overblik,
              I kan handle på med det samme.
            </p>
            <div className="pain-list">
              <div className="pain-item">
                <div className="pain-icon">📝</div>
                <div className="pain-text">
                  <strong>Journal</strong> — sidste opgave eller tomme fraser. Nuancer og borgerens
                  fremgang forsvinder.
                </div>
              </div>
              <div className="pain-item">
                <div className="pain-icon">💊</div>
                <div className="pain-text">
                  <strong>Medicin</strong> — kræver fokus hver gang. Spredte lister øger risiko og
                  mental belastning.
                </div>
              </div>
              <div className="pain-item">
                <div className="pain-icon">🗂</div>
                <div className="pain-text">
                  <strong>Borgeroplysninger</strong> — PRP, allergi, aftaler overalt. Tid der kunne
                  være nærvær.
                </div>
              </div>
            </div>
          </div>

          <div className="fi fi-d1">
            <div className="eyebrow" style={{ marginBottom: 20 }}>
              Hvad kan hvad?
            </div>
            <div className="comp-table">
              <div className="comp-row hdr">
                <div className="comp-cell">Funktion</div>
                <div className="comp-cell budr-c">BUDR</div>
                <div className="comp-cell">Planner4You</div>
                <div className="comp-cell">Citizen ONE</div>
                <div className="comp-cell">KMD</div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">Journal- &amp; notatstøtte tæt på vagten</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">Medicin &amp; udlevering med sporbarhed</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">
                  Samlet borgerprofil (PRP, risiko, kontakter)
                </div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">Realtidsstatus pr. borger</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">
                  Borgerens stemme direkte i systemet (Lys)
                </div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">
                  AI-dagplan — først efter personalets godkendelse
                </div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">Vagtskifte-overblik på under 2 min.</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">Varsler ved krise / manglende tjek-in</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">Onboarding under 5 minutter</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">GDPR · databehandling i DK/EU</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
                <div className="comp-cell">
                  <span className="yes">✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="portal-section" id="portalen">
        <div className="portal-grid fi">
          <div>
            <div className="eyebrow">Care Portal — bygget til personalet</div>
            <h2 className="section-h">
              Alt det, I alligevel ville spørge kollegaen om — <em>samlet ét sted</em>
            </h2>
            <p className="section-p">
              Hvem har det svært, hvad er aftalt, hvad skal journalen vide — uden fire programmer.
              Beslutningsstøtte til jeres faglighed.
            </p>
            <div className="feature-pills">
              <div className="fpill">
                <div className="fpill-icon">📊</div>
                <div>
                  <div className="fpill-title">Dagsoverblik</div>
                  <div className="fpill-desc">
                    Ok / øje på / mangler tjek — sorteret efter behov.
                  </div>
                </div>
              </div>
              <div className="fpill">
                <div className="fpill-icon">📝</div>
                <div>
                  <div className="fpill-title">Journal</div>
                  <div className="fpill-desc">
                    Udkast fra dagen og Lys — godkend frem for blank skærm.
                  </div>
                </div>
              </div>
              <div className="fpill">
                <div className="fpill-icon">💊</div>
                <div>
                  <div className="fpill-title">Medicin &amp; profil</div>
                  <div className="fpill-desc">Færre skærme, sporbarhed omkring udlevering.</div>
                </div>
              </div>
              <div className="fpill">
                <div className="fpill-icon">⚡</div>
                <div>
                  <div className="fpill-title">Varsler</div>
                  <div className="fpill-desc">
                    Lys og manglende tjek — her og nu, ikke i morgenposten.
                  </div>
                </div>
              </div>
              <div className="fpill">
                <div className="fpill-icon">✅</div>
                <div>
                  <div className="fpill-title">Planforslag</div>
                  <div className="fpill-desc">AI foreslår — intet uden jeres godkendelse.</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
              <Link href="/care-portal-demo" className="btn-sm">
                Interaktiv demo
              </Link>
              <Link href="/care-portal-login" className="btn-sm-ghost">
                Log ind →
              </Link>
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
                <div className="ps-nav-item active">📊 Dagsoverblik</div>
                <div className="ps-nav-item">👤 Beboere &amp; profil</div>
                <div className="ps-nav-item">📝 Journal</div>
                <div className="ps-nav-item">💊 Medicin</div>
                <div className="ps-nav-item">✅ Planforslag</div>
                <div className="ps-nav-item">⚡ Varsler</div>
                <div className="ps-nav-item">⚙ Indstillinger</div>
              </div>
              <div className="ps-main">
                <div className="ps-main-title">Dagsoverblik · 12 beboere</div>
                <div className="ps-col-h">
                  <span />
                  <span>Navn</span>
                  <span>Status</span>
                  <span>Signal</span>
                  <span>Siden</span>
                </div>
                <div className="ps-res-row">
                  <div className="res-dot d-green" />
                  <span>Thomas Vang</span>
                  <span className="ps-badge badge-ok">Rolig</span>
                  <span className="ps-note">God energi</span>
                  <span className="ps-note">07:48</span>
                </div>
                <div className="ps-res-row">
                  <div className="res-dot d-amber" />
                  <span>Camilla Frost</span>
                  <span className="ps-badge badge-warn">Opmærksom</span>
                  <span className="ps-note">Lys: angst</span>
                  <span className="ps-note">08:05</span>
                </div>
                <div className="ps-res-row">
                  <div className="res-dot d-red" />
                  <span>Jakob Møller</span>
                  <span className="ps-badge badge-crit">Intet tjek</span>
                  <span className="ps-note">—</span>
                  <span className="ps-note">—</span>
                </div>
                <div className="ps-res-row">
                  <div className="res-dot d-green" />
                  <span>Sara Jensen</span>
                  <span className="ps-badge badge-ok">Rolig</span>
                  <span className="ps-note">Glad</span>
                  <span className="ps-note">07:22</span>
                </div>
                <div className="ps-res-row">
                  <div className="res-dot d-green" />
                  <span>Mikkel Dahl</span>
                  <span className="ps-badge badge-ok">Rolig</span>
                  <span className="ps-note">Ok</span>
                  <span className="ps-note">08:11</span>
                </div>
                <div
                  style={{
                    padding: '10px 10px 0',
                    fontSize: '0.68rem',
                    color: 'var(--fog)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Viser 5 af 12 beboere</span>
                  <span style={{ color: 'var(--amber)', fontSize: '0.7rem' }}>Se alle →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="roles-section" id="hvad-kan-budr" aria-labelledby={rolesHeadingId}>
        <div className="fi">
          <div className="eyebrow">Én platform — mange roller</div>
          <h2 className="section-h" id={rolesHeadingId}>
            Hvad kan BUDR Care? <em>Valgfrit: din rolle.</em>
          </h2>
          <p className="section-p roles-intro">
            Vælg rolle — se gevinsten. Demoen tilpasser vi; vi starter ofte hos pædagogerne.
          </p>

          <div
            className="roles-tablist"
            role="tablist"
            aria-label="Vælg rolle for at se, hvad BUDR Care tilbyder"
          >
            {ROLE_BLOCKS.map((r) => {
              const tabId = `budr-role-tab-${r.id}`;
              const panelId = `budr-role-panel-${r.id}`;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  id={tabId}
                  className="roles-tab"
                  aria-selected={activeRole === r.id}
                  aria-controls={panelId}
                  tabIndex={activeRole === r.id ? 0 : -1}
                  onClick={() => setActiveRole(r.id)}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`budr-role-panel-${active.id}`}
            aria-labelledby={`budr-role-tab-${active.id}`}
            className="roles-panel"
          >
            <h3 className="roles-panel-h">{active.title}</h3>
            <p className="roles-panel-lead">{active.lead}</p>
            <ul className="roles-panel-ul">
              {active.bullets.map((line, i) => (
                <li key={`${active.id}-${i}`} className="roles-panel-li">
                  {line}
                </li>
              ))}
            </ul>
            <p className="roles-panel-demo">
              Demo: <span>{active.demo}</span>
            </p>
            {active.showLysSectionLink ? (
              <a href="#lys" className="roles-lys-link">
                Hele Lys-sektionen →
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="lys-section" id="lys">
        <div className="lys-grid fi">
          <div className="lys-mock-wrap">
            <div className="lys-hdr">
              <div className="lys-av">L</div>
              <div>
                <div className="lys-nm">Lys</div>
                <div className="lys-st">● Aktiv nu</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--fog)' }}>
                09:41
              </div>
            </div>
            <div className="chat-b user">
              Jeg er lidt nervøs i dag. Ikke helt sikker på hvorfor.
            </div>
            <div className="chat-b ai">
              Det lyder som en tung start. Hvad tror du er det første, der fylder mest lige nu?
            </div>
            <div className="chat-notif">⚡ Angstmarkering sendt til personalets portal</div>
            <div className="chat-b user">Måske mødet med sagsbehandleren senere.</div>
            <div className="chat-b ai">
              Sådanne møder kan føles store. Vil du prøve en helt lille plan for, hvad du gerne vil
              sige?
            </div>
            <div
              style={{ marginTop: 12, fontSize: '0.68rem', color: 'var(--fog)', marginBottom: 5 }}
            >
              Dagens energi (fra borgeren)
            </div>
            <div className="energy-bar">
              <div className="e-seg" style={{ background: '#d95555' }} />
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
            </div>
          </div>
          <div>
            <div className="eyebrow">Lys — borgerens stemme</div>
            <h2 className="section-h">
              Værdighed starter med at blive hørt — <em>også når ordene mangler</em>
            </h2>
            <p className="section-p">
              I <a href="#hvad-kan-budr">Hvad kan BUDR Care?</a> er Lys kort forklaret for borgeren.
              Her er produktet i dybden: borger og portal hænger sammen — tryghed og bedre
              beslutninger uden sagsnummer-følelse.
            </p>
            <div className="lys-bonus-pills">
              <div className="lys-bonus-pill">
                <div className="lys-bonus-pill-icon">🗣</div>
                <p>
                  <strong>Borgerens stemme i data</strong> — ikke kun personalets vurdering.
                </p>
              </div>
              <div className="lys-bonus-pill">
                <div className="lys-bonus-pill-icon">🌙</div>
                <p>
                  <strong>24/7.</strong> Eskalerer til personalet, når det er nødvendigt.
                </p>
              </div>
              <div className="lys-bonus-pill">
                <div className="lys-bonus-pill-icon">🔐</div>
                <p>
                  <strong>Link + ét klik</strong> — ingen app-butik, intet tungt login.
                </p>
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              <Link href="/app" className="btn-sm">
                Åbn Lys-demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <div className="fi" style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ display: 'flex', justifyContent: 'center' }}>
            Fra pædagoger og ledere
          </div>
          <h2
            className="section-h"
            style={{ margin: '0 auto', textAlign: 'center', maxWidth: 'none' }}
          >
            Når hverdagen føles anderledes
          </h2>
        </div>
        <div className="t-grid fi fi-d1">
          <div className="t-card">
            <div className="t-stars">★★★★★</div>
            <p className="t-text">
              Borgerne siger ting til Lys, de ikke når i køkkenet. Vi ser det i portalen før
              opgavefordeling — et forspring for omsorgen.
            </p>
            <div className="t-author">
              Socialpsykiatrisk pædagog · botilbud · Region Midtjylland
            </div>
          </div>
          <div className="t-card">
            <div className="t-stars">★★★★★</div>
            <p className="t-text">
              Cirka to timer om dagen tilbage til borgerne frem for skærm og notater. Som leder:
              tydeligt, vi er på rette vej.
            </p>
            <div className="t-author">Leder · socialpsykiatrisk botilbud · Aalborg</div>
          </div>
          <div className="t-card">
            <div className="t-stars">★★★★☆</div>
            <p className="t-text">
              Ikke endnu et kontrolsystem — det hjælper os med at møde mennesker som mennesker.
              Borgerne mærker det.
            </p>
            <div className="t-author">Pædagog · bosted · Nordjylland</div>
          </div>
        </div>
      </section>

      <section className="origin-section" id="om-budr">
        <div className="origin-grid fi">
          <div>
            <div className="eyebrow">Om BUDR</div>
            <h2 className="section-h">
              Skabt ud fra praksis — ikke fra et whiteboard langt fra vagten
            </h2>
            <p className="section-p">
              Værdig hverdag for borgeren, respekt for personalets faglighed. Hjælp til at huske,
              prioritere og dokumentere det, der betyder noget.
            </p>
            <div className="origin-quote">
              <p>
                Når borgeren høres gennem Lys, bliver arbejdet mere meningsfuldt — bedre møder
                mellem mennesker.
              </p>
              <cite>Socialpsykiatrisk pædagog · botilbud · Region Midtjylland</cite>
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--fog)',
                marginBottom: 24,
              }}
            >
              Udviklingen bag BUDR
            </div>
            <div className="timeline">
              <div className="tl-item">
                <div className="tl-dot-col">
                  <div className="tl-dot" />
                  <div className="tl-line" />
                </div>
                <div>
                  <div className="tl-year">Udgangspunkt</div>
                  <div className="tl-text">
                    Systemer dokumenterede fortiden — ikke hvem der har brug for hjælp nu.
                  </div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-dot-col">
                  <div className="tl-dot" />
                  <div className="tl-line" />
                </div>
                <div>
                  <div className="tl-year">PARK som rygrad</div>
                  <div className="tl-text">
                    PARK som rygrad — personcentrering I mærker, ikke bare på papir.
                  </div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-dot-col">
                  <div className="tl-dot" />
                  <div className="tl-line" />
                </div>
                <div>
                  <div className="tl-year">Pilot 2025</div>
                  <div className="tl-text">
                    Pilot: tre botilbud — mindre dokumentation; borgere opsøger Lys selv.
                  </div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-dot-col">
                  <div className="tl-dot" />
                </div>
                <div>
                  <div className="tl-year">Nu</div>
                  <div className="tl-text">
                    Klar til flere bosteder. Kort onboarding. Demo med jeres faglige blik.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-bg" aria-hidden />
        <div style={{ position: 'relative', zIndex: 1 }} className="fi">
          <div
            className="eyebrow"
            style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}
          >
            Klar til at mærke forskellen?
          </div>
          <h2>
            Vi viser det på <em>jeres</em> præmisser — for personale og borgere
          </h2>
          <p className="cta-lead">
            Ikke generisk slidshow — journal, medicin, profiler og Lys ud fra jeres hverdag.
          </p>
          <div className="cta-actions">
            <a
              href="mailto:hej@budrcare.dk?subject=Demo%20af%20BUDR%20Care"
              className="btn-primary"
            >
              Book en samtale
            </a>
            <Link href="/care-portal-demo" className="btn-ghost">
              Prøv Care Portal demo →
            </Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-grid">
          <div>
            <div className="footer-logo">
              <div className="logo-mark">B</div>
              BUDR Care
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
            <h5>Selskab</h5>
            <a href="#hvad-kan-budr">Hvad kan BUDR?</a>
            <a href="#om-budr">Om BUDR</a>
            <a href="#skift">Hverdag &amp; systemer</a>
            <a href="mailto:hej@budrcare.dk">Kontakt</a>
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
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} BUDR ApS · Aalborg, Danmark</span>
          <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>
            *Baseret på lederudsagn fra pilot · botilbud Aalborg 2025
          </span>
        </div>
      </footer>
    </div>
  );
}

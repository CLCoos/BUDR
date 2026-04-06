'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import MarketingContactForm from '@/components/marketing/MarketingContactForm';
import { Printer } from 'lucide-react';

type Props = {
  className?: string;
};

export default function PilotpakkePage({ className = '' }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);

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

  return (
    <div ref={rootRef} className={`budr-landing pilotpakke-page ${className}`.trim()}>
      <nav aria-label="Primær navigation" className={navOpen ? 'is-open' : undefined}>
        <div className="nav-inner">
          <Link href="/" className="nav-logo" aria-label="BUDR Care — forsiden" onClick={closeNav}>
            <BudrLogo dark size={40} />
          </Link>
          <div className="nav-actions-bar">
            <button
              type="button"
              className="nav-mobile-demo pilotpakke-no-print"
              onClick={() => window.print()}
              aria-label="Gem som PDF via print"
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--amber-lt)',
              }}
            >
              PDF
            </button>
            <button
              type="button"
              className="nav-menu-toggle"
              aria-expanded={navOpen}
              aria-controls="pilotpakke-nav-panel"
              id="pilotpakke-nav-toggle"
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
          <ul className="nav-links" id="pilotpakke-nav-panel" role="list">
            <li>
              <Link href="/" onClick={closeNav}>
                Forsiden
              </Link>
            </li>
            <li>
              <Link href="/institutioner" onClick={closeNav}>
                Institutioner
              </Link>
            </li>
            <li>
              <Link href="/care-portal-demo" onClick={closeNav}>
                Demo
              </Link>
            </li>
            <li className="pilotpakke-no-print">
              <button
                type="button"
                className="nav-cta"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  font: 'inherit',
                  padding: 0,
                  display: 'inline',
                }}
                onClick={() => window.print()}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Printer size={14} aria-hidden /> PDF
                </span>
              </button>
            </li>
            <li>
              <a href="#kontakt" className="nav-cta" onClick={closeNav}>
                Kontakt →
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div className="budr-landing-content">
        <section className="intro-section intro-section--lead fi" aria-label="Pilotpakke">
          <div className="shell">
            <div className="intro-head">
              <div className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>
                Fast tilbud til beslutningstagere
              </div>
              <h1 className="section-h" style={{ maxWidth: '40rem', margin: '0 auto' }}>
                <em>Pilotpakken</em> — hvad I køber, hvad I bidrager, hvordan vi måler
              </h1>
              <p className="intro-lead" style={{ maxWidth: '44rem' }}>
                Denne side er en <strong>konkret ramme</strong> for et pilotforløb med BUDR Care (
                <strong>Lys</strong> + <strong>Care Portal</strong>). Den kan gemmes som PDF via
                print-funktionen i browseren og deles internt til ledelse, økonomi og DPO — uden at
                I skal gætte jer til indholdet.
              </p>
              <div
                className="hero-actions pilotpakke-no-print"
                style={{ justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}
              >
                <button type="button" className="btn-primary" onClick={() => window.print()}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Printer size={18} aria-hidden /> Gem som PDF (print)
                  </span>
                </button>
                <Link href="/care-portal-demo" className="btn-ghost">
                  Se demo først
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="intro-section fi" aria-labelledby="pp-afgraensning">
          <div className="shell">
            <h2 className="section-h" id="pp-afgraensning">
              Afgrænsning
            </h2>
            <p className="section-p" style={{ maxWidth: '42rem', margin: '0 auto 20px' }}>
              <strong>Varighed:</strong> typisk <strong>8–12 uger</strong> fra “go-live” for
              pilotomfanget. Længden tilpasses, så I både når en travl og en mere rolig periode —
              det er med til at give et retvisende billede for ledelse og økonomi.
            </p>
            <p className="section-p" style={{ maxWidth: '42rem', margin: '0 auto 20px' }}>
              <strong>Formål:</strong> At dokumentere værdi og egnethed i <em>jeres</em> drift —
              journalflow, overblik, varsling og borgerinvolvering (Lys) — med målbare
              succeskriterier, I er enige om før start.
            </p>
            <div
              className="pilotpakke-table-wrap"
              style={{
                maxWidth: '44rem',
                margin: '0 auto',
                padding: '18px 20px',
                border: '1px solid rgba(133, 183, 235, 0.25)',
                borderRadius: 12,
                background: 'rgba(0,0,0,0.15)',
              }}
            >
              <h3 className="section-h" style={{ fontSize: '1.05rem', marginBottom: 12 }}>
                Overblik over faser
              </h3>
              <ul
                className="section-p"
                style={{
                  margin: 0,
                  paddingLeft: '1.2rem',
                  color: 'var(--white-dim)',
                  lineHeight: 1.65,
                }}
              >
                <li style={{ marginBottom: 10 }}>
                  <strong style={{ color: 'var(--white)' }}>Forberedelse (ca. 2–6 uger):</strong>{' '}
                  aftale, roller, IT/DPO, brugeroprettelse, baseline-måling, oplæringsplan.
                </li>
                <li style={{ marginBottom: 10 }}>
                  <strong style={{ color: 'var(--white)' }}>Drift (kerne 6–10 uger):</strong> daglig
                  brug af Care Portal og Lys i aftalt omfang; aftalte supportkanaler; midtvejsmøde
                  (typisk 30–45 min.).
                </li>
                <li>
                  <strong style={{ color: 'var(--white)' }}>Afslutning (1–2 uger):</strong>{' '}
                  evaluering mod succeskriterier, anbefaling om fortsættelse, oprydning hvis I ikke
                  fortsætter.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="intro-section fi" aria-labelledby="pp-leverancer">
          <div className="shell">
            <h2 className="section-h" id="pp-leverancer">
              Det leverer BUDR i pilotpakken
            </h2>
            <ul
              className="section-p"
              style={{
                maxWidth: '42rem',
                margin: '0 auto',
                paddingLeft: '1.25rem',
                color: 'var(--white-dim)',
                lineHeight: 1.65,
              }}
            >
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--white)' }}>Produktadgang:</strong> Lys og Care Portal
                i det omfang, der er beskrevet i jeres pilotaftale (antal brugere / borgere —
                konkret tal aftales skriftligt).
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--white)' }}>Onboarding:</strong> introduktion til
                journal (kladde/godkendt), overblik, plan/360° og relevante AI-funktioner efter
                jeres valg — som <strong>video og/eller livesessioner</strong> (antal sessioner
                aftales).
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--white)' }}>Support i pilotperioden:</strong> aftalt
                kontaktkanal (fx e-mail) og forventet <strong>responstid på hverdage</strong> (fx
                inden for 24–48 timer — præciseres i kontrakten).
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--white)' }}>Fælles tjekpunkter:</strong>{' '}
                <strong>midtvejs</strong> og <strong>afsluttende</strong> gennemgang med
                pilotansvarlig — med fokus på succeskriterier og eventuelle justeringer.
              </li>
              <li>
                <strong style={{ color: 'var(--white)' }}>Dokumentation:</strong> henvisning til{' '}
                <Link href="/privacy" style={{ color: 'var(--amber-lt)' }}>
                  privatlivspolitik
                </Link>
                ; teknisk bilag og underdatabehandlerliste udleveres efter behov til IT/DPO.
              </li>
            </ul>
          </div>
        </section>

        <section className="intro-section fi" aria-labelledby="pp-bidrag">
          <div className="shell">
            <h2 className="section-h" id="pp-bidrag">
              Det stiller bostedet med
            </h2>
            <ul
              className="section-p"
              style={{
                maxWidth: '42rem',
                margin: '0 auto',
                paddingLeft: '1.25rem',
                color: 'var(--white-dim)',
                lineHeight: 1.65,
              }}
            >
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--white)' }}>Pilotansvarlig:</strong> én person med
                mandat til at træffe daglige beslutninger og eskalere internt (ledelse, HR, IT).
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--white)' }}>Tid fra personalet:</strong> deltagelse i
                oplæring, brug af flows i aftalt omfang, og kort forberedelse til midtvejs- og
                slutmøde (typisk samlet nogle få timer pr. nøgleperson over piloten).
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--white)' }}>IT-forudsætninger:</strong> stabilt
                netværk, understøttet browser og mulighed for at oprette/vedligeholde brugere efter
                BUDRs vejledning (eller jeres IT gør det sammen med os).
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--white)' }}>
                  Borgere til Lys (valgfrit men anbefalet):
                </strong>{' '}
                udvalgte borgere, der er indforståede med at bruge Lys i pilotperioden — proces for
                samtykke/information er <strong>jeres ansvar</strong> som tilbud.
              </li>
              <li>
                <strong style={{ color: 'var(--white)' }}>Baseline:</strong> kort registrering før
                start (fx tid til overblik ved vagtskifte, andel åbne journal-kladder) så vi kan
                sammenligne med slutpunktet.
              </li>
            </ul>
          </div>
        </section>

        <section className="intro-section fi" aria-labelledby="pp-maaling">
          <div className="shell">
            <h2 className="section-h" id="pp-maaling">
              Succeskriterier og måling
            </h2>
            <p className="section-p" style={{ maxWidth: '42rem', margin: '0 auto 20px' }}>
              I vælger <strong>3–5 konkrete indikatorer</strong> før pilotstart. Eksempler (ikke
              krav — tilpasses jer):
            </p>
            <ul
              className="section-p"
              style={{
                maxWidth: '42rem',
                margin: '0 auto',
                paddingLeft: '1.25rem',
                color: 'var(--white-dim)',
                lineHeight: 1.65,
              }}
            >
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--white)' }}>Tid til overblik:</strong> andel af
                vagter, hvor teamet inden for X minutter efter start har relevant overblik i
                portalen (selvvurdering eller stikprøve).
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--white)' }}>Journal:</strong> udvikling i andel
                notater, der når <strong>godkendt</strong> inden for aftalt frist, eller færre
                langtliggende <strong>kladder</strong> end ved baseline.
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--white)' }}>Borgerinvolvering:</strong> antal borgere
                med mindst ét struktureret tjek-in pr. uge i Lys (eller anden aftalt aktivitet dér).
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--white)' }}>Medarbejderoplevelse:</strong> kort
                “pulse” (1–5) efter uge 2 og uge 8 — om værktøjet opleves som hjælpsomt, ikke som
                ekstra byrde.
              </li>
              <li>
                <strong style={{ color: 'var(--white)' }}>Ledelse/tilsyn:</strong> om dokumentation
                og sporbarhed opleves tydelig nok til intern kvalitetsdialog (qualitativ vurdering i
                slutmøde).
              </li>
            </ul>
            <p
              className="section-p"
              style={{
                maxWidth: '42rem',
                margin: '20px auto 0',
                fontSize: '0.9rem',
                color: 'var(--fog)',
              }}
            >
              Måling må ikke blive et kontrolinstrument mod medarbejdere — den skal understøtte
              fælles læring og beslutningsgrundlag for ledelse og økonomi.
            </p>
          </div>
        </section>

        <section className="intro-section fi" aria-labelledby="pp-efter">
          <div className="shell">
            <h2 className="section-h" id="pp-efter">
              Efter piloten
            </h2>
            <p className="section-p" style={{ maxWidth: '42rem', margin: '0 auto 16px' }}>
              Ved afslutning leverer vi en <strong>kort skriftlig opsummering</strong>: resultater
              mod succeskriterier, anbefaling og — hvis I ønsker det — forslag til fortsættelse med
              licens, supportniveau og evt. udvidet rullefart på flere afdelinger.
            </p>
            <p
              className="section-p"
              style={{ maxWidth: '42rem', margin: '0 auto', fontSize: '0.92rem' }}
            >
              Vælger I ikke at fortsætte, aftales <strong>datansættelse og sletning</strong> efter
              jeres databehandleraftale og interne retningslinjer.
            </p>
          </div>
        </section>

        <p className="pilotpakke-print-footer">
          BUDR Care — Pilotpakke. Digital version: se websitets adresse /pilotpakke — Henvendelse:
          hej@budrcare.dk
        </p>

        <section className="cta-section pilotpakke-no-print" id="kontakt" aria-label="Kontakt">
          <div className="cta-bg" aria-hidden />
          <div className="shell fi pilotpakke-no-print" style={{ position: 'relative', zIndex: 1 }}>
            <h2>
              <em>Start dialogen</em>
            </h2>
            <p className="cta-lead">
              Skriv at I ønsker at tale <strong>pilotpakken</strong> og jeres succeskriterier — vi
              svarer typisk inden for to hverdage.
            </p>
            <MarketingContactForm source="pilotpakke" responseWeekdays={2} />
            <div className="cta-actions" style={{ marginTop: 24 }}>
              <Link href="/institutioner" className="btn-ghost">
                Institutionsstien →
              </Link>
              <Link href="/care-portal-demo" className="btn-ghost">
                Care Portal-demo
              </Link>
            </div>
          </div>
        </section>

        <footer className="pilotpakke-no-print">
          <div className="footer-grid shell">
            <div>
              <div className="footer-logo">
                <BudrLogo dark size={36} />
              </div>
              <p className="footer-desc">Pilotpakke — BUDR Care.</p>
            </div>
            <div className="footer-col">
              <h5>Genveje</h5>
              <Link href="/">Forsiden</Link>
              <Link href="/institutioner">Institutioner</Link>
              <Link href="/care-portal-demo">Demo</Link>
            </div>
            <div className="footer-col">
              <h5>Juridisk</h5>
              <Link href="/privacy">Privatlivspolitik</Link>
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

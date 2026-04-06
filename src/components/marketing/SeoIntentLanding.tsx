'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import type { SeoIntentDefinition } from '@/lib/marketing/seoIntentContent';
import MarketingContactForm from '@/components/marketing/MarketingContactForm';
import { useBudrLandingFadeIn } from '@/components/marketing/useBudrLandingFadeIn';

function renderInlineEmphasis(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

type Props = {
  content: SeoIntentDefinition;
  className?: string;
};

export default function SeoIntentLanding({ content, className = '' }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [navOpen, setNavOpen] = useState(false);
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

  return (
    <div ref={rootRef} className={`budr-landing ${className}`.trim()}>
      <nav aria-label="Primær navigation" className={navOpen ? 'is-open' : undefined}>
        <div className="nav-inner">
          <Link href="/" className="nav-logo" aria-label="BUDR Care — forsiden" onClick={closeNav}>
            <BudrLogo dark size={40} />
          </Link>
          <div className="nav-actions-bar">
            <a href="#kontakt" className="nav-mobile-demo" onClick={closeNav}>
              Kontakt
            </a>
            <button
              type="button"
              className="nav-menu-toggle"
              aria-expanded={navOpen}
              aria-controls="seo-intent-nav-panel"
              id="seo-intent-nav-toggle"
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
          <ul className="nav-links" id="seo-intent-nav-panel" role="list">
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
            <li>
              <a href="#kontakt" className="nav-cta" onClick={closeNav}>
                Pilot / kontakt →
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div className="budr-landing-content">
        <section className="intro-section intro-section--lead fi" aria-label="Indledning">
          <div className="shell">
            <div className="intro-head">
              <div className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>
                For botilbud og kommuner
              </div>
              <h1 className="section-h" style={{ maxWidth: '38rem', margin: '0 auto' }}>
                {content.h1}
              </h1>
              <p className="intro-lead" style={{ maxWidth: '40rem' }}>
                {renderInlineEmphasis(content.lead)}
              </p>
              <div className="hero-actions" style={{ justifyContent: 'center', marginTop: 24 }}>
                <Link href="/care-portal-demo" className="btn-primary">
                  Åbn Care Portal-demo
                </Link>
                <a href="#kontakt" className="btn-ghost">
                  Skriv om pilot
                </a>
              </div>
            </div>
          </div>
        </section>

        {content.blocks.map((block, bi) => (
          <section
            key={block.title}
            className="intro-section fi"
            aria-labelledby={`seo-block-${bi}`}
          >
            <div className="shell">
              <h2 className="section-h" id={`seo-block-${bi}`}>
                {block.title}
              </h2>
              {block.paragraphs.map((p, pi) => (
                <p
                  key={`${bi}-${pi}`}
                  className="section-p"
                  style={{ maxWidth: '40rem', margin: '0 auto 16px' }}
                >
                  {renderInlineEmphasis(p)}
                </p>
              ))}
            </div>
          </section>
        ))}

        <section className="intro-section fi" aria-label="Relaterede sider">
          <div className="shell">
            <h2 className="section-h">Læs også</h2>
            <ul
              className="section-p"
              style={{
                maxWidth: '36rem',
                margin: '0 auto',
                paddingLeft: '1.25rem',
                color: 'var(--white-dim)',
                lineHeight: 1.75,
              }}
            >
              {content.related.map((r) => (
                <li key={r.href} style={{ marginBottom: 8 }}>
                  <Link href={r.href} style={{ color: 'var(--amber-lt)' }}>
                    {r.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="cta-section" id="kontakt" aria-label="Kontakt">
          <div className="cta-bg" aria-hidden />
          <div className="shell fi" style={{ position: 'relative', zIndex: 1 }}>
            <h2>
              <em>Demo eller pilot</em>
            </h2>
            <p className="cta-lead">
              Fortæl kort om jeres botilbud eller forvaltning — vi svarer typisk inden for{' '}
              <strong>to hverdage</strong> og kan tage udgangspunkt i den måde, I fandt siden på.
            </p>
            <MarketingContactForm source={content.formSource} responseWeekdays={2} />
            <div className="cta-actions" style={{ marginTop: 24 }}>
              <Link href="/care-portal-demo" className="btn-ghost">
                Kun demo først
              </Link>
              <Link href="/institutioner" className="btn-ghost">
                Hele institutionsstien →
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
              <p className="footer-desc">BUDR Care — Lys og Care Portal til socialpsykiatrien.</p>
            </div>
            <div className="footer-col">
              <h5>Produkter</h5>
              <Link href="/care-portal-demo">Care Portal demo</Link>
              <Link href="/app">Lys</Link>
            </div>
            <div className="footer-col">
              <h5>Genveje</h5>
              <Link href="/">Forsiden</Link>
              <Link href="/institutioner">Institutioner</Link>
              <Link href="/pilotpakke">Pilotpakke</Link>
              <a href="#kontakt">Kontakt</a>
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

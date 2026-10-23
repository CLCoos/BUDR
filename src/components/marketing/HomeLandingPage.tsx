'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  ClipboardCheck,
  Copy,
  FileCheck2,
  HeartHandshake,
  Lock,
  Menu,
  MessageCircle,
  Mic,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { BudrLogo } from '@/components/brand/BudrLogo';
import { BOOKING_URL, CONTACT_EMAIL, CONTACT_URL } from '@/components/marketing/constants';

const DEMO_URL = '/care-portal-demo';

const NAV = [
  { href: '#saadan', label: 'Sådan virker det' },
  { href: '#borgeren', label: 'Borgeren' },
  { href: '#pilot', label: 'Pilot' },
  { href: '#spoergsmaal', label: 'Spørgsmål' },
] as const;

const FAQ = [
  {
    q: 'Erstatter BUDR vores journalsystem?',
    a: 'Ja, hvis I vil. BUDR har journal med godkendelse, medicin med kvittering, kalender, vagtplan, overlevering, VUM 2.0-dokumenter og registrering af magtanvendelser. Beskeder til og fra lægen (MedCom) er endnu ikke med. Kommunen eller jeres organisation kræver måske, at den officielle journal bliver i fx Sensum eller Nexus. Så bruger I BUDR til det daglige arbejde og kopierer de godkendte notater over med ét tryk.',
  },
  {
    q: 'Hvor ligger vores data?',
    a: 'Databasen ligger i EU (Stockholm). Data er krypteret, både når de ligger, og når de sendes. Vi underskriver en databehandleraftale før piloten, og I får listen over underdatabehandlere til jeres DPO.',
  },
  {
    q: 'Hvad med AI og GDPR?',
    a: 'AI-forslagene behandles i dag hos en udbyder i USA. Vi er i gang med at flytte dem til EU (Frankfurt). Spørg os om status, så får I et ærligt svar. AI’en foreslår kun. Intet gemmes, før en medarbejder har sagt ja, og medicin ændres aldrig automatisk.',
  },
  {
    q: 'Understøtter BUDR VUM 2.0?',
    a: 'Ja. Statusudtalelsen til kommunen følger VUM 2.0’s opbygning. BUDR laver et udkast ud fra jeres notater og borgerens egne ord, og kontaktpersonen retter og godkender.',
  },
  {
    q: 'Hvad hvis en borger ikke vil bruge en app?',
    a: 'Så virker alt andet stadig. Lys er frivillig for borgeren, og personalet kan arbejde i BUDR uden den.',
  },
  {
    q: 'Hvad koster det?',
    a: 'Pilot er gratis i 3 måneder. Efterfølgende: tre prismodeller (Start/Vækst/Organisation) afhængigt af bostedets størrelse. Vi sender den fulde prisstruktur efter indledende samtale.',
  },
  {
    q: 'Hvem ejer dataene?',
    a: 'Bostedet og borgeren. Vi er kun databehandler.',
  },
] as const;

/** Fade elementer ind, når de kommer frem. Uden JavaScript eller med «reduceret bevægelse» vises alt med det samme. */
function useReveal(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.classList.add('bf-anim');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('bf-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    el.querySelectorAll('.bf-reveal').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
}

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`bf-wordmark${light ? ' bf-wordmark--light' : ''}`}>
      <BudrLogo size={30} dark={light} showWordmark={false} />
      <span>
        BUDR<span className="bf-wordmark-care">care</span>
      </span>
    </span>
  );
}

function BrowserFrame({
  src,
  alt,
  label,
  priority = false,
}: {
  src: string;
  alt: string;
  label: string;
  priority?: boolean;
}) {
  return (
    <figure className="bf-browser">
      <div className="bf-browser-bar" aria-hidden>
        <span />
        <span />
        <span />
        <em>{label}</em>
      </div>
      <Image
        src={src}
        alt={alt}
        width={1800}
        height={1009}
        sizes="(max-width: 960px) 100vw, 720px"
        priority={priority}
      />
    </figure>
  );
}

function Shot({
  src,
  alt,
  width,
  height,
  wide = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** På mobilen: vis venstre del i større størrelse, så teksten kan læses. */
  wide?: boolean;
}) {
  return (
    <figure className={`bf-shot${wide ? ' bf-shot--wide' : ''}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(max-width: 1080px) 100vw, 680px"
      />
    </figure>
  );
}

function PhoneFrame({
  src,
  alt,
  height,
  priority = false,
  className = '',
}: {
  src: string;
  alt: string;
  height: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <figure className={`bf-phone ${className}`.trim()}>
      <div className="bf-phone-screen">
        <Image src={src} alt={alt} width={640} height={height} sizes="300px" priority={priority} />
      </div>
    </figure>
  );
}

function Point({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="bf-point">
      <span className="bf-point-icon" aria-hidden>
        {icon}
      </span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </li>
  );
}

type HomeLandingPageProps = { className?: string };

export default function HomeLandingPage({ className = '' }: HomeLandingPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useReveal(rootRef);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div ref={rootRef} className={`bf ${className}`.trim()}>
      <a href="#indhold" className="bf-skip">
        Spring til indhold
      </a>

      <header className={`bf-nav${scrolled || menuOpen ? ' bf-nav--solid' : ''}`}>
        <div className="bf-shell bf-nav-inner">
          <a href="#top" className="bf-nav-logo" aria-label="BUDRcare, til toppen">
            <Wordmark />
          </a>
          <nav className="bf-nav-links" aria-label="Primær navigation">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="bf-nav-cta">
            <Link href="/care-portal-login" className="bf-nav-login">
              Log ind
            </Link>
            <Link href={DEMO_URL} className="bf-btn bf-btn--primary bf-btn--sm">
              Prøv demoen
            </Link>
            <button
              type="button"
              className="bf-burger"
              aria-expanded={menuOpen}
              aria-controls="bf-menu"
              aria-label={menuOpen ? 'Luk menu' : 'Åbn menu'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        <div
          id="bf-menu"
          className={`bf-menu${menuOpen ? ' bf-menu--open' : ''}`}
          hidden={!menuOpen}
        >
          <nav className="bf-shell" aria-label="Menu">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>
                {n.label}
                <ArrowRight size={18} aria-hidden />
              </a>
            ))}
            <div className="bf-menu-ctas">
              <Link href={DEMO_URL} className="bf-btn bf-btn--primary">
                Prøv demoen selv
              </Link>
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bf-btn bf-btn--ghost"
              >
                Book pilotsamtale
              </a>
              <Link href="/care-portal-login" className="bf-menu-login">
                Log ind for personale
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main id="indhold">
        {/* HERO */}
        <section className="bf-hero" id="top">
          <div className="bf-hero-glow" aria-hidden />
          <div className="bf-shell bf-hero-grid">
            <div className="bf-hero-copy">
              <p className="bf-pill">
                <span className="bf-pill-dot" aria-hidden />
                Til socialpsykiatriske bosteder · §107 og §108
              </p>
              <h1>
                Hver vagt ved, hvad der skal ske.
                <span> Intet glipper.</span>
              </h1>
              <p className="bf-lead">
                BUDR guider personalet gennem vagten, skriver notaterne, mens I fortæller, og holder
                bostedet klar til tilsyn. Hver dag.
              </p>
              <div className="bf-hero-ctas">
                <Link href={DEMO_URL} className="bf-btn bf-btn--primary bf-btn--lg">
                  <PlayCircle size={20} aria-hidden />
                  Prøv demoen selv
                </Link>
                <a
                  href={BOOKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bf-btn bf-btn--ghost bf-btn--lg"
                >
                  Book pilotsamtale
                </a>
              </div>
              <p className="bf-hero-note">
                Ingen login. Fiktive data. Guidet tur på ca. 5 minutter.
              </p>
            </div>

            <div className="bf-hero-visual">
              <div className="bf-hero-browser">
                <BrowserFrame
                  src="/marketing/d-vagt.webp"
                  alt="BUDR Care Portal: vagtens forside med næste opgave, dagens tjekliste og assistentens forslag"
                  label="budrcare.dk · Vagt"
                  priority
                />
              </div>
              <PhoneFrame
                src="/marketing/m-vagt.webp"
                alt="BUDR på mobilen: næste opgave er en morgendosis, der ikke er registreret"
                height={1385}
                priority
                className="bf-hero-phone"
              />
              <div className="bf-float bf-float--a" aria-hidden>
                <BellRing size={16} />
                Dosis mangler · vagten har fået besked
              </div>
              <div className="bf-float bf-float--b" aria-hidden>
                <Check size={16} />
                Notat godkendt
              </div>
            </div>
          </div>

          <div className="bf-shell">
            <ul className="bf-promises" aria-label="Tre løfter">
              <li>
                <a href="#tilsyn">
                  <span className="bf-promise-icon" aria-hidden>
                    <ShieldCheck size={20} />
                  </span>
                  <span>
                    <strong>Klar til tilsyn hver dag</strong>
                    <small>Frister og godkendelser samlet ét sted</small>
                  </span>
                </a>
              </li>
              <li>
                <a href="#fortael">
                  <span className="bf-promise-icon" aria-hidden>
                    <Mic size={20} />
                  </span>
                  <span>
                    <strong>Dokumentationen skriver sig selv</strong>
                    <small>Fortæl med egne ord, godkend med ét tryk</small>
                  </span>
                </a>
              </li>
              <li>
                <a href="#saadan">
                  <span className="bf-promise-icon" aria-hidden>
                    <BellRing size={20} />
                  </span>
                  <span>
                    <strong>Intet glipper</strong>
                    <small>Ved vagtskifte eller medicin</small>
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </section>

        {/* LØFTE 3: VAGT */}
        <section className="bf-section" id="saadan">
          <div className="bf-shell bf-split bf-reveal">
            <div className="bf-split-copy">
              <p className="bf-kicker">Vagten</p>
              <h2>Intet glipper ved vagtskifte eller medicin</h2>
              <p className="bf-sub">
                Forsiden er bygget op som vagten selv: Mød ind, Nu og Gå hjem. Den viser altid det
                næste, der skal ske, så ingen skal lede efter det.
              </p>
              <ul className="bf-points">
                <Point icon={<BellRing size={18} />} title="Alarm ved glemt medicin">
                  Er en dosis ikke registreret, får vagten besked med navn, præparat og tidspunkt.
                </Point>
                <Point
                  icon={<ClipboardCheck size={18} />}
                  title="Overleveringen er skrevet på forhånd"
                >
                  Det, I fortæller i løbet af vagten, samles til næste hold. Ingen huskesedler.
                </Point>
                <Point icon={<Sparkles size={18} />} title="En assistent, der rækker hånden frem">
                  Den foreslår samtaler, opgaver og påmindelser. Intet gemmes, før du siger ja.
                </Point>
              </ul>
            </div>
            <div className="bf-split-visual">
              <Shot
                src="/marketing/vagt-close.webp"
                alt="Næste opgave: Mikkels morgendosis er ikke registreret. Under den vagtens tjekliste og assistentens forslag."
                width={1500}
                height={759}
                wide
              />
            </div>
          </div>
        </section>

        {/* LØFTE 2: FORTÆL */}
        <section className="bf-section bf-section--tint" id="fortael">
          <div className="bf-shell bf-split bf-split--flip bf-reveal">
            <div className="bf-split-copy">
              <p className="bf-kicker">Fortæl</p>
              <h2>Dokumentationen skriver sig selv</h2>
              <p className="bf-sub">
                Tryk på Fortæl og sig, hvad der skete. Som til en kollega. BUDR laver forslag til
                notat, overlevering og opgaver, og du godkender.
              </p>
              <ol className="bf-steps">
                <li>
                  <span>1</span>
                  <div>
                    <strong>Sig det med dine egne ord</strong>
                    <p>
                      «Sara og jeg var ude og handle i Netto. Hun betalte selv ved kassen for første
                      gang.»
                    </p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <strong>BUDR sorterer det</strong>
                    <p>
                      Notat til Saras forløb, en linje til overleveringen og et delmål, der rykker.
                    </p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <strong>Du godkender, og det er gjort</strong>
                    <p>
                      <Copy size={14} aria-hidden className="bf-inline-icon" /> Notatet ligger i
                      borgerens journal. Bruger I også et andet fagsystem, kopierer I det over med
                      ét tryk.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
            <div className="bf-split-visual">
              <Shot
                src="/marketing/fortael-close.webp"
                alt="Fortæl-vinduet i BUDR: en medarbejder har skrevet om en indkøbstur med Sara og trykker Lav forslag"
                width={1100}
                height={954}
              />
            </div>
          </div>
        </section>

        {/* LØFTE 1: TILSYN */}
        <section className="bf-section" id="tilsyn">
          <div className="bf-shell bf-split bf-reveal">
            <div className="bf-split-copy">
              <p className="bf-kicker">Lederen</p>
              <h2>Klar til tilsyn hver dag, ikke kun ugen før</h2>
              <p className="bf-sub">
                Lederen ser det, der kræver en beslutning: dokumenter til godkendelse, frister hos
                kommunen og huller i vagtplanen. Resten passer sig selv.
              </p>
              <ul className="bf-points">
                <Point icon={<FileCheck2 size={18} />} title="Statusudtalelser på VUM 2.0">
                  BUDR laver udkastet ud fra notaterne. Kontaktpersonen retter, lederen godkender.
                  Alle versioner gemmes.
                </Point>
                <Point icon={<CalendarClock size={18} />} title="Frister, før de bliver et problem">
                  Påmindelser i god tid om handleplaner og statusudtalelser.
                </Point>
                <Point icon={<ShieldCheck size={18} />} title="Tilsynsoverblik">
                  Ét sted, der viser, hvad der mangler, før tilsynet ser det.
                </Point>
              </ul>
            </div>
            <div className="bf-split-visual">
              <BrowserFrame
                src="/marketing/d-leder.webp"
                alt="Lederens forside i BUDR med godkendelse af statusudtalelse og vagtplan"
                label="Vagt · Leder"
              />
            </div>
          </div>
        </section>

        {/* BORGEREN */}
        <section className="bf-dark" id="borgeren">
          <div className="bf-shell">
            <div className="bf-dark-head bf-reveal">
              <p className="bf-kicker bf-kicker--light">Borgeren</p>
              <h2>Borgeren har en stemme i sit eget forløb</h2>
              <p className="bf-sub">
                Med Lys fortæller borgeren, hvordan dagen går, og skriver til personalet. I Care
                Portal ser kontaktpersonen hele forløbet, med borgerens egne ord.
              </p>
            </div>
            <div className="bf-dark-grid bf-reveal">
              <div className="bf-dark-phone">
                <PhoneFrame
                  src="/marketing/m-lys.webp"
                  alt="Lys, borgerens app: Hvordan har du det lige nu? med fem farver"
                  height={1336}
                />
                <ul className="bf-dark-list">
                  <li>
                    <Sun size={18} aria-hidden /> Tjek ind med én farve
                  </li>
                  <li>
                    <MessageCircle size={18} aria-hidden /> Skriv til personalet og se, når det er
                    læst
                  </li>
                  <li>
                    <HeartHandshake size={18} aria-hidden /> Store knapper, også på de svære dage
                  </li>
                </ul>
              </div>
              <div className="bf-dark-story">
                <BrowserFrame
                  src="/marketing/d-forloeb.webp"
                  alt="Saras forløb i BUDR med humørkurve, mønster og hendes egne ord"
                  label="Borgere · Sara"
                />
                <blockquote>
                  <p>
                    Sara har det svært et par dage efter hver gang, hendes mor har været på besøg.
                    BUDR viser mønsteret, så kontaktpersonen kan tage samtalen i tide. Det er et
                    forslag, som personalet tjekker med Sara.
                  </p>
                  <cite>Fra demoen · fiktiv borger</cite>
                </blockquote>
              </div>
            </div>
          </div>
        </section>

        {/* ROLLER */}
        <section className="bf-section" id="roller">
          <div className="bf-shell bf-reveal">
            <div className="bf-center-head">
              <p className="bf-kicker">Til alle på bostedet</p>
              <h2>Hver rolle får sin egen vej gennem dagen</h2>
              <p className="bf-sub">
                BUDR er ikke en værktøjskasse, man selv skal finde rundt i. Den viser hver
                medarbejder, hvad de skal gøre nu.
              </p>
            </div>
            <ul className="bf-roles">
              <li>
                <UserRound size={22} aria-hidden />
                <strong>Medarbejder</strong>
                <p>Næste opgave, medicin og notater i rækkefølge.</p>
              </li>
              <li>
                <HeartHandshake size={22} aria-hidden />
                <strong>Kontaktperson</strong>
                <p>Borgerens forløb, delmål og dokumenter med udkast klar.</p>
              </li>
              <li>
                <ShieldCheck size={22} aria-hidden />
                <strong>Leder</strong>
                <p>Godkendelser, frister og vagtplan på ét sted.</p>
              </li>
              <li>
                <Users size={22} aria-hidden />
                <strong>Vikar</strong>
                <p>Det vigtigste om hver borger på to minutter.</p>
              </li>
            </ul>
          </div>
        </section>

        {/* ÆRLIGT OM DATA + GRUNDLÆGGER */}
        <section className="bf-section bf-section--tint" id="tillid">
          <div className="bf-shell bf-trust bf-reveal">
            <article className="bf-card">
              <span className="bf-card-icon" aria-hidden>
                <Lock size={20} />
              </span>
              <h3>Ærligt om data</h3>
              <ul className="bf-checks">
                <li>Databasen ligger i EU (Stockholm), krypteret.</li>
                <li>Databehandleraftale underskrives før piloten.</li>
                <li>AI foreslår kun. Intet gemmes uden et ja fra en medarbejder.</li>
                <li>AI-forslag behandles i dag i USA. Vi flytter dem til EU.</li>
                <li>Kan være jeres eneste system eller arbejde sammen med det, I har.</li>
              </ul>
            </article>
            <article className="bf-card bf-founder">
              <p className="bf-kicker">Hvem står bag</p>
              <h3>Bygget på gulvet, ikke på et kontor</h3>
              <p>
                Christian Cloos arbejder selv på et socialpsykiatrisk bosted. Han kender
                aftenvagten, hvor man bruger mere tid på at klikke sig gennem skemaer end på at være
                sammen med borgerne. Han kender vikaren, der ikke ved, hvem der mangler medicin, og
                statusudtalelsen, der skrives i Word ved siden af systemet, fordi systemet ikke kan.
                BUDR er bygget, så systemet arbejder for personalet og ikke omvendt.
              </p>
              <p>
                Recovery-tankegangen (CHIME) ligger under det hele: forbundethed, håb, identitet,
                mening og egen styrke.
              </p>
              <p className="bf-founder-sign">Christian Cloos · stifter, BUDR Care, Aalborg</p>
            </article>
          </div>
        </section>

        {/* PILOT */}
        <section className="bf-section" id="pilot">
          <div className="bf-shell bf-reveal">
            <div className="bf-center-head">
              <p className="bf-kicker">Pilot</p>
              <h2>Vi starter småt, sammen</h2>
              <p className="bf-sub">Pilot er gratis i 3 måneder. Ingen binding bagefter.</p>
            </div>
            <ol className="bf-pilot">
              <li>
                <span className="bf-pilot-n">1</span>
                <p className="bf-pilot-time">15 min</p>
                <h3>Samtale</h3>
                <p>Vi hører om jeres hverdag og viser BUDR på jeres egne eksempler.</p>
              </li>
              <li>
                <span className="bf-pilot-n">2</span>
                <p className="bf-pilot-time">3 måneder</p>
                <h3>Pilot på én afdeling</h3>
                <p>Vi sætter op, lærer personalet det og retter til undervejs.</p>
              </li>
              <li>
                <span className="bf-pilot-n">3</span>
                <p className="bf-pilot-time">Sammen</p>
                <h3>Evaluering</h3>
                <p>Vi ser på, hvad der virkede, og I beslutter, om I vil fortsætte.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section className="bf-section bf-section--tint" id="spoergsmaal">
          <div className="bf-shell bf-faq-wrap bf-reveal">
            <div className="bf-faq-head">
              <p className="bf-kicker">Spørgsmål</p>
              <h2>Det, vi oftest bliver spurgt om</h2>
              <p className="bf-sub">
                Mangler du et svar? Skriv til{' '}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </p>
            </div>
            <div className="bf-faq">
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* SLUT-CTA */}
        <section className="bf-final" id="kontakt">
          <div className="bf-shell bf-final-inner bf-reveal">
            <h2>Se det selv. Det tager fem minutter.</h2>
            <p>Demoen kører i browseren med fiktive borgere. Bagefter tager vi gerne en snak.</p>
            <div className="bf-hero-ctas bf-final-ctas">
              <Link href={DEMO_URL} className="bf-btn bf-btn--white bf-btn--lg">
                <PlayCircle size={20} aria-hidden />
                Prøv demoen selv
              </Link>
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bf-btn bf-btn--outline-light bf-btn--lg"
              >
                Book pilotsamtale
              </a>
            </div>
            <p className="bf-final-fine">
              {CONTACT_EMAIL} · <Link href={CONTACT_URL}>Skriv til os</Link> · BUDR Care, Aalborg
            </p>
          </div>
        </section>
      </main>

      <footer className="bf-footer">
        <div className="bf-shell bf-footer-grid">
          <div>
            <Wordmark />
            <p className="bf-footer-desc">
              Care Portal til personalet. Lys til borgeren. Til socialpsykiatriske bosteder.
            </p>
          </div>
          <div>
            <h4>Produkt</h4>
            <Link href={DEMO_URL}>Prøv demoen</Link>
            <Link href="/app">Lys borgerapp</Link>
            <Link href="/pilotpakke">Pilotpakke</Link>
          </div>
          <div>
            <h4>Information</h4>
            <Link href="/institutioner">Til institutioner</Link>
            <Link href="/care-portal-login">Personalelogin</Link>
            <a
              href="https://www.linkedin.com/company/budr"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </div>
          <div>
            <h4>Juridisk</h4>
            <Link href="/privacy">Privatlivspolitik</Link>
            <Link href="/cookies">Cookiepolitik</Link>
            <Link href="/terms">Vilkår</Link>
          </div>
        </div>
        <div className="bf-shell bf-footer-bottom">
          <span>© {new Date().getFullYear()} BUDR Care · Aalborg, Danmark</span>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </div>
      </footer>
    </div>
  );
}

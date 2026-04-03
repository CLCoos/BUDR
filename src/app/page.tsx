'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react';

const sans =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = parseInt(el.dataset.revealDelay ?? '0', 10);
          setTimeout(() => el.classList.add('reveal-visible'), delay);
          observer.unobserve(el);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function AnimatedStat({ value, label }: { value: string; label: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="text-center transition-all duration-1000"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
      }}
    >
      <p
        className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl"
        style={{ fontFamily: sans }}
      >
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-neutral-500">{label}</p>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[min(100%,240px)]" style={{ aspectRatio: '9/19' }}>
      <div
        className="absolute inset-0 rounded-[2.35rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.28)]"
        style={{
          background: 'linear-gradient(165deg, #1c1c1e 0%, #0d0d0f 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      />
      <div
        className="absolute overflow-hidden rounded-[2.05rem]"
        style={{ inset: 5, background: '#000' }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <span className="text-[10px] font-medium text-white/50">09:41</span>
          <div className="flex gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-white/25" />
          </div>
        </div>
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 pb-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: 'var(--budr-purple)' }}
          >
            <span className="text-[11px] font-semibold text-white">L</span>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white">Lys</p>
            <p className="text-[9px] text-emerald-400/90">Aktiv</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 px-3 pt-3">
          <div
            className="budr-chat-1 self-end max-w-[78%] rounded-2xl rounded-br-md px-3 py-2 opacity-0"
            style={{ background: 'var(--budr-purple)' }}
          >
            <p className="text-[10px] leading-snug text-white">Jeg er lidt nervøs i dag</p>
          </div>
          <div
            className="budr-chat-2 self-start max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2 opacity-0"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <p className="text-[10px] leading-snug text-white/90">
              Det er helt okay. Hvad tror du udløser det?
            </p>
          </div>
          <div className="budr-chat-3 self-end opacity-0">
            <div
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-medium"
              style={{
                background: 'rgba(127,119,221,0.2)',
                color: '#c4b5fd',
                border: '1px solid rgba(127,119,221,0.35)',
              }}
            >
              Humørtjek · registreret
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 border-t border-white/[0.06] bg-black/40 px-3 py-2.5">
          <div className="flex-1 rounded-full bg-white/[0.07] px-3 py-1.5 text-[9px] text-white/35">
            Skriv til Lys…
          </div>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: 'var(--budr-purple)' }}
          >
            <ArrowRight className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PortalMockup({ pulseRow }: { pulseRow?: boolean }) {
  const rows = [
    { name: 'Maria K.', meta: '08:32', dot: '#22c55e' },
    { name: 'Thomas B.', meta: '07:55', dot: '#eab308' },
    { name: 'Sara J.', meta: 'Ingen tjek', dot: '#ef4444', emphasize: true },
  ];
  return (
    <div
      className="w-full max-w-[320px] overflow-hidden rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.2)]"
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div
        className="flex h-8 items-center gap-2 border-b px-3"
        style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#fafafa' }}
      >
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-neutral-300" />
          <span className="h-2 w-2 rounded-full bg-neutral-300" />
          <span className="h-2 w-2 rounded-full bg-neutral-300" />
        </div>
        <span className="flex-1 text-center text-[10px] font-medium text-neutral-400">
          care.budr.dk
        </span>
      </div>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-neutral-900">Dagsoverblik</p>
            <p className="text-[10px] text-neutral-400">I dag · 12 beboere</p>
          </div>
          <span className="text-sm">🏥</span>
        </div>
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div
              key={r.name}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-shadow duration-500 ${
                pulseRow && r.emphasize ? 'budr-pulse-row' : ''
              }`}
              style={{ background: '#f4f4f5' }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background: r.dot,
                    boxShadow: `0 0 0 3px ${r.dot}22`,
                  }}
                />
                <span className="text-[11px] font-medium text-neutral-800">{r.name}</span>
              </div>
              <span className="text-[9px] tabular-nums text-neutral-400">{r.meta}</span>
            </div>
          ))}
        </div>
        <div
          className="mt-3 rounded-lg px-3 py-2 text-center text-[10px] font-medium"
          style={{ background: 'rgba(29,158,117,0.1)', color: 'var(--budr-teal)' }}
        >
          1 beboer kræver opmærksomhed nu
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  useScrollReveal();
  const productRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = useCallback(() => {
    productRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const scrollToDemo = useCallback(() => {
    demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      <style>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        [data-reveal].reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @keyframes budr-chat-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .budr-chat-1 { animation: budr-chat-in 0.5s ease-out 0.4s forwards; }
        .budr-chat-2 { animation: budr-chat-in 0.5s ease-out 1.2s forwards; }
        .budr-chat-3 { animation: budr-chat-in 0.45s ease-out 2.4s forwards; }
        @keyframes budr-pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
          35% { box-shadow: 0 0 0 6px rgba(239,68,68,0.15); }
          70% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        .budr-pulse-row {
          animation: budr-pulse-ring 2.2s ease-in-out 2.8s infinite;
        }
        @keyframes budr-beam {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        .budr-signal-beam {
          animation: budr-beam 2.2s ease-in-out 1s infinite;
        }
      `}</style>

      <div
        className="min-h-screen bg-[#fbfbfd] text-neutral-900 antialiased"
        style={{ fontFamily: sans }}
      >
        {/* Nav */}
        <header
          className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#fbfbfd]/80 backdrop-blur-xl backdrop-saturate-150"
          style={{ WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}
        >
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:h-[3.25rem] sm:px-8">
            <div className="flex items-center gap-2">
              <AppLogo size={28} />
              <span className="text-[15px] font-semibold tracking-tight text-neutral-900">
                BUDR Care
              </span>
            </div>
            <nav className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={scrollToProducts}
                className="hidden rounded-full px-3 py-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 sm:block"
              >
                Produkter
              </button>
              <button
                type="button"
                onClick={scrollToDemo}
                className="hidden rounded-full px-3 py-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 sm:block"
              >
                Sådan virker det
              </button>
              <Link
                href="/care-portal-demo"
                className="rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Prøv portal
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="relative px-5 pb-24 pt-16 sm:pb-32 sm:pt-24">
          <div className="mx-auto max-w-4xl text-center">
            <p
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500"
              data-reveal
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--budr-teal)]" aria-hidden />
              Botilbud · Region Midtjylland
            </p>
            <h1
              className="text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-neutral-950 sm:text-5xl sm:leading-[1.05] lg:text-[3.5rem]"
              data-reveal
              data-reveal-delay="40"
            >
              Borgeren når ud.
              <br />
              <span className="text-neutral-400">Du ser det med det samme.</span>
            </h1>
            <p
              className="mx-auto mt-6 max-w-lg text-[17px] leading-relaxed text-neutral-500 sm:text-lg"
              data-reveal
              data-reveal-delay="80"
            >
              Lys fanger stemning og signaler i lommen. Care Portal samler dem, før dagen spinder
              af.
            </p>
            <div
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
              data-reveal
              data-reveal-delay="120"
            >
              <Link
                href="/app"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-neutral-900 px-8 text-[15px] font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Åbn Lys
                <ArrowUpRight className="h-4 w-4 opacity-80" />
              </Link>
              <a
                href="mailto:hej@budrcare.dk?subject=Demo%20af%20BUDR%20Care"
                className="inline-flex h-12 items-center rounded-full px-6 text-[15px] font-medium text-[var(--budr-teal)] transition-colors hover:text-[#17875f]"
              >
                Book en gennemgang →
              </a>
            </div>
          </div>
        </section>

        {/* Demonstration — show the loop */}
        <section
          ref={demoRef}
          id="sadan-virker-det"
          className="scroll-mt-16 border-t border-black/[0.06] bg-white px-5 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center" data-reveal>
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                Ét øjeblik. To overflader.
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-neutral-500">
                Ingen pitch — bare flowet. Det, borgeren gør i Lys, lander i overblikket uden ekstra
                tastearbejde.
              </p>
            </div>

            <div
              className="mt-16 flex flex-col items-center justify-center gap-10 lg:flex-row lg:gap-6 xl:gap-10"
              data-reveal
              data-reveal-delay="80"
            >
              <div className="flex flex-col items-center">
                <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  Borger · Lys
                </p>
                <PhoneMockup />
              </div>

              <div className="flex flex-col items-center justify-center gap-3 lg:min-w-[100px]">
                <div
                  className="budr-signal-beam hidden h-[3px] w-full max-w-[140px] rounded-full lg:block"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, var(--budr-purple), var(--budr-teal), transparent)',
                  }}
                />
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] bg-neutral-50 text-neutral-400 lg:hidden">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <span className="hidden text-center text-[10px] font-medium uppercase tracking-wider text-neutral-400 lg:block">
                  Samme hændelse
                </span>
              </div>

              <div className="flex flex-col items-center">
                <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  Personale · Portal
                </p>
                <PortalMockup pulseRow />
              </div>
            </div>
          </div>
        </section>

        {/* Bento — outcomes as visuals */}
        <section ref={productRef} className="scroll-mt-16 px-5 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <h2
              className="mx-auto max-w-xl text-center text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl"
              data-reveal
            >
              Mindre gæt. Mere møde.
            </h2>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              <div
                className="rounded-3xl border border-black/[0.06] bg-white p-8 shadow-sm sm:col-span-2 lg:col-span-2 lg:row-span-1"
                data-reveal
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  Overblik
                </p>
                <p className="mt-3 max-w-md text-xl font-semibold leading-snug tracking-tight text-neutral-900 sm:text-2xl">
                  Træf prioriteringen, mens kaffen stadig er varm.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {['Rolig nat', 'Hold øje', 'Tjek ind'].map((t, i) => (
                    <span
                      key={t}
                      className="rounded-full px-3 py-1.5 text-[12px] font-medium"
                      style={{
                        background: i === 1 ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.12)',
                        color: i === 1 ? '#a16207' : '#15803d',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                  <span
                    className="rounded-full px-3 py-1.5 text-[12px] font-medium"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#b91c1c' }}
                  >
                    Kræver dig
                  </span>
                </div>
                <p className="mt-6 text-sm leading-relaxed text-neutral-500">
                  Trafiklysene er et fælles sprog — ikke en erstatning for faglighed.
                </p>
              </div>

              <div
                className="rounded-3xl border border-black/[0.06] bg-gradient-to-b from-white to-neutral-50 p-8 shadow-sm"
                data-reveal
                data-reveal-delay="60"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  Start
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">
                  &lt; 5
                </p>
                <p className="text-sm text-neutral-500">minutter til første rigtige visning.</p>
                <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full w-[92%] rounded-full"
                    style={{ background: 'var(--budr-teal)' }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-neutral-400">Onboarding · næsten færdig</p>
              </div>

              <div
                className="rounded-3xl border border-black/[0.06] bg-neutral-900 p-8 text-white shadow-sm"
                data-reveal
                data-reveal-delay="100"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  Data
                </p>
                <p className="mt-3 text-lg font-semibold leading-snug">
                  Udformet til persondata i drift — ikke som et sidespor.
                </p>
                <Link
                  href="/privacy"
                  className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white"
                >
                  Læs privatlivspolitik <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div
                className="rounded-3xl border border-black/[0.06] bg-white p-8 shadow-sm sm:col-span-2"
                data-reveal
                data-reveal-delay="140"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  Mestring
                </p>
                <p className="mt-3 max-w-lg text-lg font-semibold leading-snug text-neutral-900">
                  Fremskridt, borgeren kan se — have, små sejre, tydelig retning.
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  Styrker <span className="font-medium text-neutral-700">mestrings-tro</span> gennem
                  synlige skridt — ikke bare point på en skærm.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Products — minimal, CTA forward */}
        <section className="border-t border-black/[0.06] bg-[#f5f5f7] px-5 py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
            <div data-reveal>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                Lys
              </p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
                Støtte, når hverdagen er tung.
              </h3>
              <p className="mt-4 text-[17px] leading-relaxed text-neutral-500">
                Samtale, humør, plan og ro — i én rolig flade. Demo i browseren; produktion med
                sikkert login pr. borger.
              </p>
              <Link
                href="/app"
                className="mt-8 inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--budr-purple)] hover:underline"
              >
                Åbn Lys <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="mt-10 flex justify-center sm:justify-start">
                <PhoneMockup />
              </div>
            </div>
            <div data-reveal data-reveal-delay="80">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                Care Portal
              </p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
                Overblik, der følger vagten.
              </h3>
              <p className="mt-4 text-[17px] leading-relaxed text-neutral-500">
                Beskeder, planforslag og dokumentationsstøtte — samlet, så teamet kan handle
                ensartet.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/care-portal-demo"
                  className="inline-flex h-11 items-center rounded-full bg-[var(--budr-teal)] px-6 text-[14px] font-medium text-white"
                >
                  Interaktiv demo
                </Link>
                <Link
                  href="/care-portal-login"
                  className="inline-flex h-11 items-center rounded-full border border-black/[0.12] bg-white px-6 text-[14px] font-medium text-neutral-800"
                >
                  Log ind
                </Link>
              </div>
              <div className="mt-10 flex justify-center sm:justify-end">
                <PortalMockup />
              </div>
            </div>
          </div>
        </section>

        {/* Proof */}
        <section className="px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4" data-reveal>
              {['Botilbud Midtjylland', 'Socialpsykiatri Nordjylland', 'Pilot 2025'].map((name) => (
                <div
                  key={name}
                  className="rounded-2xl border border-black/[0.06] bg-white px-5 py-3 text-[13px] font-medium text-neutral-500"
                >
                  {name}
                </div>
              ))}
            </div>
            <div
              className="mt-14 grid grid-cols-1 gap-10 border-t border-black/[0.06] pt-14 sm:grid-cols-3"
              data-reveal
              data-reveal-delay="80"
            >
              <AnimatedStat value="3" label="aktive botilbud" />
              <AnimatedStat value="< 5 min" label="onboardingstid" />
              <AnimatedStat value="24/7" label="Lys tilgængelig" />
            </div>
          </div>
        </section>

        {/* Quotes */}
        <section className="border-t border-black/[0.06] bg-white px-5 py-20 sm:py-28">
          <div className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-2 sm:gap-16">
            <blockquote data-reveal>
              <p className="text-xl font-medium leading-relaxed text-neutral-900 sm:text-2xl sm:leading-snug">
                Borgerne fortæller os, hvad der sker — selv når de ikke har ord for det. BUDR giver
                dem sproget og strukturen til at række ud.
              </p>
              <footer className="mt-8 text-sm text-neutral-500">
                Socialpsykiatrisk pædagog · botilbud · Region Midtjylland
              </footer>
            </blockquote>
            <blockquote data-reveal data-reveal-delay="80">
              <p className="text-xl font-medium leading-relaxed text-neutral-900 sm:text-2xl sm:leading-snug">
                Vi har sparet cirka 2 timer dagligt på dokumentation siden vi tog BUDR i brug.
              </p>
              <footer className="mt-8 text-sm text-neutral-500">
                Leder · socialpsykiatrisk botilbud · Aalborg
              </footer>
            </blockquote>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-5 py-24 sm:py-32" style={{ background: '#000' }}>
          <div className="mx-auto max-w-2xl text-center" data-reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              Vil du se det på jeres egne borgeres præmisser?
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-white/55">
              Vi viser — vi lover ikke mirakler. Book en gennemgang, eller åbn demoerne selv.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <a
                href="mailto:hej@budrcare.dk?subject=Demo%20af%20BUDR%20Care"
                className="inline-flex h-12 items-center rounded-full bg-white px-8 text-[15px] font-medium text-neutral-900 transition-transform hover:scale-[1.02]"
              >
                Book samtale
              </a>
              <Link
                href="/care-portal-demo"
                className="inline-flex h-12 items-center rounded-full border border-white/25 px-8 text-[15px] font-medium text-white hover:bg-white/10"
              >
                Prøv Care Portal
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-black/[0.06] bg-[#f5f5f7] px-5 py-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <AppLogo size={26} />
                <div>
                  <p className="text-sm font-semibold text-neutral-900">BUDR</p>
                  <p className="text-xs text-neutral-500">Socialpsykiatri · borger og personale</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-500">
                <a href="mailto:hej@budrcare.dk" className="hover:text-neutral-900">
                  hej@budrcare.dk
                </a>
                <Link href="/privacy" className="hover:text-neutral-900">
                  Privatlivspolitik
                </Link>
                <Link href="/cookies" className="hover:text-neutral-900">
                  Cookies
                </Link>
                <Link href="/terms" className="hover:text-neutral-900">
                  Vilkår
                </Link>
                <a
                  href="https://www.linkedin.com/company/budr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neutral-900"
                >
                  LinkedIn
                </a>
              </div>
            </div>
            <p className="mt-10 text-center text-xs text-neutral-400">
              © {new Date().getFullYear()} BUDR. Alle rettigheder forbeholdes.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

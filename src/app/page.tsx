'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import {
  ArrowRight,
  Brain,
  Check,
  Clock,
  FileText,
  Heart,
  MessageSquare,
  Shield,
  Star,
  Zap,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   Scroll-reveal hook — fades + lifts elements into view
───────────────────────────────────────────────────────── */
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
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ─────────────────────────────────────────────────────────
   Animated counter stat
───────────────────────────────────────────────────────── */
function AnimatedStat({ value, label }: { value: string; label: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-1 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
      }}
    >
      <span
        className="text-3xl font-extrabold tabular-nums"
        style={{ color: 'var(--budr-purple)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {value}
      </span>
      <span className="text-sm font-medium text-slate-500">{label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CSS-only phone mockup with animated Lys chat
───────────────────────────────────────────────────────── */
function PhoneMockup() {
  return (
    <div className="relative mx-auto" style={{ width: 220, height: 440 }}>
      {/* Phone shell */}
      <div
        className="absolute inset-0 rounded-[2.5rem] shadow-2xl"
        style={{
          background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)',
          border: '2px solid rgba(255,255,255,0.12)',
        }}
      />
      {/* Notch */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-b-xl"
        style={{ top: 10, width: 60, height: 18, background: '#0d0d1a' }}
      />
      {/* Screen */}
      <div
        className="absolute overflow-hidden rounded-[2.2rem]"
        style={{ inset: 6, background: '#0f1423' }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 pt-5 pb-2">
          <span className="text-[9px] font-semibold text-white/60">09:41</span>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
            <div className="h-1.5 w-2.5 rounded-sm bg-white/40" />
          </div>
        </div>
        {/* App header */}
        <div className="flex items-center gap-2 border-b border-white/6 px-4 pb-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: 'var(--budr-purple)' }}
          >
            <span className="text-[10px] font-bold text-white">L</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-white leading-none">Lys</p>
            <p className="text-[8px] text-green-400 leading-none mt-0.5">● Online</p>
          </div>
        </div>
        {/* Chat messages */}
        <div className="flex flex-col gap-2 px-3 pt-3" style={{ minHeight: 260 }}>
          {/* User message */}
          <div
            className="chat-msg-1 self-end max-w-[70%] rounded-2xl rounded-br-sm px-3 py-2"
            style={{ background: 'var(--budr-purple)', opacity: 0 }}
          >
            <p className="text-[10px] text-white leading-snug">Jeg er lidt nervøs i dag 😟</p>
          </div>
          {/* Typing dots */}
          <div
            className="chat-typing self-start max-w-[50%] rounded-2xl rounded-bl-sm px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.08)', opacity: 0 }}
          >
            <div className="flex items-center gap-1">
              <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-white/60" />
              <span
                className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-white/60"
                style={{ animationDelay: '0.2s' }}
              />
              <span
                className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-white/60"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
          </div>
          {/* Lys response */}
          <div
            className="chat-msg-2 self-start max-w-[80%] rounded-2xl rounded-bl-sm px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.08)', opacity: 0 }}
          >
            <p className="text-[10px] text-white/90 leading-snug">
              Det er helt ok at føle det sådan. Hvad tror du udløser det? 💜
            </p>
          </div>
          {/* Mood pill */}
          <div className="chat-msg-3 self-end opacity-0">
            <div
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[9px] font-semibold"
              style={{
                background: 'rgba(127,119,221,0.25)',
                color: 'var(--budr-purple)',
                border: '1px solid rgba(127,119,221,0.3)',
              }}
            >
              <span>📊</span> Humørtjek registreret
            </div>
          </div>
        </div>
        {/* Input bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 border-t border-white/6 bg-black/20 px-3 py-2.5">
          <div className="flex-1 rounded-full bg-white/8 px-3 py-1.5 text-[9px] text-white/30">
            Skriv til Lys…
          </div>
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: 'var(--budr-purple)' }}
          >
            <ArrowRight className="h-3 w-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Care Portal mini-dashboard card (desktop companion)
───────────────────────────────────────────────────────── */
function CarePortalCard() {
  const residents = [
    { name: 'Maria K.', time: '08:32', status: 'green' as const },
    { name: 'Thomas B.', time: '07:55', status: 'yellow' as const },
    { name: 'Sara J.', time: 'Ingen tjek', status: 'red' as const },
  ];
  const statusColor = { green: '#22C55E', yellow: '#EAB308', red: '#EF4444' };

  return (
    <div
      className="rounded-3xl p-5 shadow-xl"
      style={{ background: 'white', border: '1.5px solid rgba(29,158,117,0.18)', minWidth: 220 }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-800">Care Portal</p>
          <p className="text-[10px] text-slate-400">3 beboere</p>
        </div>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-xl"
          style={{ background: 'var(--budr-teal-light)' }}
        >
          <span className="text-xs">🏥</span>
        </div>
      </div>
      {/* Rows */}
      <div className="flex flex-col gap-2.5">
        {residents.map((r) => (
          <div
            key={r.name}
            className="flex items-center justify-between rounded-xl px-3 py-2"
            style={{ background: '#f8f9fc' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: statusColor[r.status],
                  boxShadow: `0 0 6px ${statusColor[r.status]}55`,
                }}
              />
              <span className="text-xs font-semibold text-slate-700">{r.name}</span>
            </div>
            <span className="text-[9px] text-slate-400">{r.time}</span>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div
        className="mt-4 rounded-xl px-3 py-2 text-center text-[10px] font-semibold"
        style={{ background: 'var(--budr-teal-light)', color: 'var(--budr-teal)' }}
      >
        1 beboer kræver opmærksomhed
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Feature grid data
───────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Brain,
    title: 'Recovery-orienteret',
    desc: 'Bygget over KRAP og PARK-metodik',
    color: '#7F77DD',
  },
  {
    icon: Clock,
    title: 'Onboarding < 5 min',
    desc: 'Personalet er klar inden første møde',
    color: '#1D9E75',
  },
  {
    icon: Shield,
    title: 'GDPR og hosting',
    desc: 'Udformet til persondatasikker drift — se privatlivspolitik',
    color: '#5E56C0',
  },
  { icon: Zap, title: 'Tidlig indsats', desc: 'Stop eskalationer, før de sker', color: '#F59E0B' },
  {
    icon: MessageSquare,
    title: 'Fælles sprog',
    desc: 'Borger og pædagog taler ud fra samme data',
    color: '#EC4899',
  },
  {
    icon: FileText,
    title: 'Dokumentationsstøtte',
    desc: 'Skabeloner der understøtter journalføring efter gældende regler — institutionen godkender',
    color: '#60A5FA',
  },
  {
    icon: Heart,
    title: '24/7 tilgængelig',
    desc: 'Lys er der, også når personalet sover',
    color: '#F472B6',
  },
  {
    icon: Star,
    title: 'Mestringstro',
    desc: 'XP, badges og have — fremskridt man kan se',
    color: '#34D399',
  },
] as const;

/* ─────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────── */
export default function HomePage() {
  useScrollReveal();
  const productRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = useCallback(() => {
    productRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      {/* ── Animation & reveal CSS ─────────────────────── */}
      <style>{`
        /* Scroll-reveal */
        [data-reveal] {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.55s ease-out, transform 0.55s ease-out;
        }
        [data-reveal].reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Hero floating blobs */
        @keyframes blob-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(20px, -15px) scale(1.05); }
          66%       { transform: translate(-10px, 10px) scale(0.97); }
        }
        .blob { animation: blob-drift 28s ease-in-out infinite; }
        .blob-2 { animation: blob-drift 22s ease-in-out infinite reverse; }
        .blob-3 { animation: blob-drift 34s ease-in-out infinite 6s; }

        /* Chat animations */
        @keyframes chat-appear { from { opacity: 0; transform: translateY(6px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .chat-msg-1 { animation: chat-appear 0.4s ease-out 0.6s forwards; }
        .chat-typing { animation: chat-appear 0.3s ease-out 1.4s forwards; }
        .chat-msg-2  { animation: chat-appear 0.4s ease-out 2.6s forwards; }
        .chat-msg-3  { animation: chat-appear 0.4s ease-out 3.6s forwards; }

        @keyframes typing-bounce { 0%, 80%, 100% { transform: scaleY(1); opacity: 0.6; } 40% { transform: scaleY(1.4); opacity: 1; } }
        .typing-dot { animation: typing-bounce 1s ease-in-out infinite; }

        /* Stagger for children with data-reveal-stagger */
        [data-stagger] > * { opacity: 0; transform: translateY(16px); transition: opacity 0.45s ease-out, transform 0.45s ease-out; }
        [data-stagger].reveal-visible > *:nth-child(1) { opacity: 1; transform: none; transition-delay: 0ms; }
        [data-stagger].reveal-visible > *:nth-child(2) { opacity: 1; transform: none; transition-delay: 80ms; }
        [data-stagger].reveal-visible > *:nth-child(3) { opacity: 1; transform: none; transition-delay: 160ms; }
        [data-stagger].reveal-visible > *:nth-child(4) { opacity: 1; transform: none; transition-delay: 240ms; }
        [data-stagger].reveal-visible > *:nth-child(5) { opacity: 1; transform: none; transition-delay: 320ms; }
        [data-stagger].reveal-visible > *:nth-child(6) { opacity: 1; transform: none; transition-delay: 400ms; }
        [data-stagger].reveal-visible > *:nth-child(7) { opacity: 1; transform: none; transition-delay: 480ms; }
        [data-stagger].reveal-visible > *:nth-child(8) { opacity: 1; transform: none; transition-delay: 560ms; }
      `}</style>

      <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
        {/* ── Sticky nav ─────────────────────────────────── */}
        <nav
          className="sticky top-0 z-50 border-b"
          style={{
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            background: 'rgba(255,255,255,0.85)',
            borderColor: 'rgba(0,0,0,0.07)',
          }}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
            <AppLogo size={30} />
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={scrollToProducts}
                className="hidden rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:block"
              >
                BUDR App
              </button>
              <Link
                href="/care-portal-demo"
                className="rounded-full px-4 py-2 text-sm font-bold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--budr-teal)' }}
              >
                Prøv Care Portal
              </Link>
              <a
                href="mailto:hej@budrcare.dk?subject=Demo af BUDR"
                className="hidden rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 sm:block"
              >
                Book demo
              </a>
            </div>
          </div>
        </nav>

        {/* ── Hero ────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden px-5 pb-20 pt-16 sm:pb-28 sm:pt-24"
          style={{ background: 'linear-gradient(155deg, #F5F4FF 0%, #ffffff 55%, #E6F7F2 100%)' }}
        >
          {/* Floating blobs */}
          <div
            className="blob pointer-events-none absolute -top-20 right-0 h-[500px] w-[500px] rounded-full opacity-[0.18] blur-3xl"
            style={{ background: 'var(--budr-purple)' }}
          />
          <div
            className="blob-2 pointer-events-none absolute bottom-0 -left-20 h-80 w-80 rounded-full opacity-[0.15] blur-3xl"
            style={{ background: 'var(--budr-teal)' }}
          />
          <div
            className="blob-3 pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.08] blur-3xl"
            style={{ background: 'var(--budr-purple-dark)' }}
          />

          <div className="relative mx-auto max-w-5xl">
            {/* Pill badge */}
            <div className="mb-6 flex justify-center">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold"
                style={{
                  borderColor: 'rgba(127,119,221,0.3)',
                  backgroundColor: 'rgba(127,119,221,0.08)',
                  color: 'var(--budr-purple)',
                }}
              >
                <span>✦</span> Bruges på botilbud i Region Midtjylland
              </span>
            </div>

            {/* Headline */}
            <h1
              className="mx-auto max-w-3xl text-center text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Borgere trives.{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--budr-purple), #A78BFA)' }}
              >
                Personalet
              </span>{' '}
              ser&nbsp;det.
            </h1>

            {/* Subtext */}
            <p className="mx-auto mt-6 max-w-xl text-center text-lg leading-relaxed text-slate-600 sm:text-xl">
              BUDR er Danmarks første AI-platform bygget til socialpsykiatrien. Borgeren har støtte
              i lommen. Du har overblikket.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                style={{
                  background:
                    'linear-gradient(135deg, var(--budr-purple), var(--budr-purple-dark))',
                }}
              >
                Kom i gang gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:hej@budrcare.dk?subject=Demo af BUDR"
                className="inline-flex items-center gap-2 rounded-full border-2 px-7 py-3.5 text-base font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: 'rgba(0,0,0,0.12)' }}
              >
                Book en demo
              </a>
            </div>

            {/* Mockup section */}
            <div className="mt-16 flex flex-col items-center justify-center gap-8 sm:flex-row sm:items-start sm:gap-12">
              <PhoneMockup />
              <div className="hidden sm:flex sm:flex-col sm:justify-center sm:gap-4 sm:pt-6">
                <CarePortalCard />
                <p className="text-center text-xs text-slate-400">
                  Realtids-overblik for personalet
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Social proof strip ───────────────────────── */}
        <section
          className="border-y px-5 py-12"
          style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#fafafa' }}
        >
          <div className="mx-auto max-w-5xl">
            <p className="mb-8 text-center text-sm font-bold uppercase tracking-widest text-slate-400">
              Tillid fra frontlinjen i dansk socialpsykiatri
            </p>
            {/* Logo placeholders */}
            <div
              className="mb-10 flex flex-wrap items-center justify-center gap-4"
              data-reveal
              data-stagger
            >
              {['Botilbud Midtjylland', 'Socialpsykiatri Nordjylland', 'Pilot 2025'].map((name) => (
                <div
                  key={name}
                  className="flex h-12 items-center justify-center rounded-2xl px-6 text-sm font-semibold text-slate-400"
                  style={{
                    background: '#f1f1f4',
                    border: '1.5px solid rgba(0,0,0,0.07)',
                    minWidth: 160,
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center" data-reveal data-reveal-delay="150">
              <AnimatedStat value="3" label="aktive botilbud" />
              <AnimatedStat value="< 5 min" label="Onboarding tid" />
              <AnimatedStat value="24/7" label="tilgængelig" />
            </div>
          </div>
        </section>

        {/* ── Products split section ───────────────────── */}
        <section ref={productRef} className="scroll-mt-20 px-5 py-20 sm:py-28">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* BUDR App */}
              <div
                className="rounded-3xl p-8"
                data-reveal
                style={{
                  background: 'linear-gradient(150deg, var(--budr-lavender) 0%, #ede9ff 100%)',
                  border: '1.5px solid rgba(127,119,221,0.2)',
                }}
              >
                <div
                  className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm"
                  style={{ background: 'white' }}
                >
                  📱
                </div>
                <h2
                  className="text-2xl font-extrabold text-slate-900"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Lys — din AI-ledsager
                </h2>
                <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--budr-purple)' }}>
                  Til borgere
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Humørtjek, dagplan, journal og krisestøtte. Altid tilgængelig.
                </p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {[
                    'AI-chat der møder borgeren med empati',
                    'Daglig humørregistrering med trafiklys',
                    'Personlig have der vokser med din indsats',
                    'Krisestøtte og nødkontakter samlet ét sted',
                    'Webapp med demo-tilstand; produktion bruger sikkert login (PIN) pr. borger',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <div
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'rgba(127,119,221,0.15)' }}
                      >
                        <Check className="h-2.5 w-2.5" style={{ color: 'var(--budr-purple)' }} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/app"
                  className="mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: 'var(--budr-purple)' }}
                >
                  Prøv appen <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Care Portal */}
              <div
                className="rounded-3xl p-8"
                data-reveal
                data-reveal-delay="100"
                style={{
                  background: 'linear-gradient(150deg, var(--budr-teal-light) 0%, #d4f5ea 100%)',
                  border: '1.5px solid rgba(29,158,117,0.2)',
                }}
              >
                <div
                  className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm"
                  style={{ background: 'white' }}
                >
                  🏥
                </div>
                <h2
                  className="text-2xl font-extrabold text-slate-900"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Care Portal — dit professionelle overblik
                </h2>
                <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--budr-teal)' }}>
                  Til personale
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Realtids-indblik i dine borgeres trivsel. Ingen overraskelser.
                </p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {[
                    'Trafiklys-overblik over alle borgere',
                    'Modtag beskeder direkte fra borgerne',
                    'Godkend og foreslå dagplaner',
                    'Skabeloner til indsats- og magtdokumentation (serviceloven)',
                    'Persondata behandlet efter GDPR — se privatlivspolitik',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <div
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'rgba(29,158,117,0.15)' }}
                      >
                        <Check className="h-2.5 w-2.5" style={{ color: 'var(--budr-teal)' }} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/care-portal-demo"
                  className="mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: 'var(--budr-teal)' }}
                >
                  Prøv Care Portal <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature grid ─────────────────────────────── */}
        <section className="px-5 py-20 sm:py-24" style={{ background: '#fafbff' }}>
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center" data-reveal>
              <h2
                className="text-3xl font-extrabold text-slate-900 sm:text-4xl"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Bygget til virkeligheden i socialpsykiatrien
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-lg text-slate-500">
                Ikke endnu et digitalt clipboard. Et levende redskab.
              </p>
            </div>
            <div
              className="grid grid-cols-2 gap-4 sm:grid-cols-4"
              data-reveal
              data-reveal-delay="100"
              data-stagger
            >
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="group rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    style={{ borderColor: `${f.color}22`, background: `${f.color}08` }}
                  >
                    <div
                      className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: `${f.color}18` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: f.color }} />
                    </div>
                    <p className="text-sm font-bold text-slate-800 leading-snug">{f.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────────── */}
        <section className="px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Quote 1 */}
              <div
                className="relative rounded-3xl px-8 py-10"
                data-reveal
                style={{
                  background:
                    'linear-gradient(135deg, rgba(127,119,221,0.09) 0%, rgba(167,139,250,0.12) 100%)',
                  border: '1.5px solid rgba(127,119,221,0.15)',
                }}
              >
                {/* Large decorative quote mark */}
                <span
                  className="pointer-events-none absolute -top-3 left-5 select-none text-8xl font-extrabold leading-none"
                  style={{ color: 'rgba(127,119,221,0.15)', fontFamily: 'Georgia, serif' }}
                  aria-hidden
                >
                  {'\u201C'}
                </span>
                <p className="relative text-lg font-semibold leading-relaxed text-slate-800 sm:text-xl">
                  Borgerne fortæller os, hvad der sker — selv når de ikke har ord for det. BUDR
                  giver dem sproget og strukturen til at række ud.
                </p>
                <p className="mt-5 text-sm font-medium text-slate-500">
                  — Socialpsykiatrisk pædagog, botilbud i Region Midtjylland
                </p>
              </div>

              {/* Quote 2 */}
              <div
                className="relative rounded-3xl px-8 py-10"
                data-reveal
                data-reveal-delay="120"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(29,158,117,0.07) 0%, rgba(52,211,153,0.10) 100%)',
                  border: '1.5px solid rgba(29,158,117,0.15)',
                }}
              >
                <span
                  className="pointer-events-none absolute -top-3 left-5 select-none text-8xl font-extrabold leading-none"
                  style={{ color: 'rgba(29,158,117,0.15)', fontFamily: 'Georgia, serif' }}
                  aria-hidden
                >
                  {'\u201C'}
                </span>
                <p className="relative text-lg font-semibold leading-relaxed text-slate-800 sm:text-xl">
                  Vi har sparet estimeret 2 timer dagligt på dokumentation siden vi tog BUDR i brug.
                </p>
                <p className="mt-5 text-sm font-medium text-slate-500">
                  — Leder, socialpsykiatrisk botilbud, Aalborg
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Care Portal feature section ───────────────── */}
        <section
          className="px-5 py-20 sm:py-28"
          style={{ background: 'linear-gradient(160deg, #f0fdf8 0%, #e6f7f2 100%)' }}
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center" data-reveal>
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold"
                style={{
                  borderColor: 'rgba(29,158,117,0.3)',
                  background: 'rgba(29,158,117,0.08)',
                  color: 'var(--budr-teal)',
                }}
              >
                🏥 Care Portal
              </div>
              <h2
                className="text-3xl font-extrabold text-slate-900 sm:text-4xl"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Designet til pædagoger, ikke it-folk
              </h2>
            </div>

            <div
              className="grid gap-5 sm:grid-cols-3"
              data-reveal
              data-reveal-delay="80"
              data-stagger
            >
              {[
                {
                  icon: '🚦',
                  title: 'Trafiklys-overblik',
                  desc: 'Se øjeblikkeligt hvem der har det svært — uden at skulle læse lange journaler.',
                },
                {
                  icon: '💬',
                  title: 'Direkte kommunikation',
                  desc: 'Borgerne sender dig beskeder. Du svarer og godkender deres planer. Alt ét sted.',
                },
                {
                  icon: '📄',
                  title: 'Struktureret dokumentation',
                  desc: 'Hjælper med at samle notater og indsatsforløb — godkendelse og myndighedsindberetning sker hos jer.',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ border: '1.5px solid rgba(29,158,117,0.15)' }}
                >
                  <span className="mb-3 block text-3xl">{card.icon}</span>
                  <h3 className="mb-2 text-base font-bold text-slate-900">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{card.desc}</p>
                </div>
              ))}
            </div>

            <div
              className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
              data-reveal
              data-reveal-delay="200"
            >
              <Link
                href="/care-portal-demo"
                className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                style={{ background: 'var(--budr-teal)' }}
              >
                Prøv Care Portal interaktivt
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/care-portal-login"
                className="inline-flex items-center gap-2 rounded-full border-2 px-8 py-4 text-base font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: 'rgba(29,158,117,0.35)', color: 'var(--budr-teal)' }}
              >
                Log ind — rigtig Care Portal
              </Link>
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ───────────────────────────────── */}
        <section
          className="px-5 py-24 sm:py-32"
          style={{
            background: 'linear-gradient(135deg, var(--budr-navy) 0%, #1a1040 50%, #0d2a1f 100%)',
          }}
        >
          <div className="mx-auto max-w-2xl text-center" data-reveal>
            <h2
              className="text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Klar til at give dine borgere bedre støtte?
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg text-white/60">
              Kom i gang på under 5 minutter. Ingen kontrakt. Ingen kreditkort.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                style={{
                  background:
                    'linear-gradient(135deg, var(--budr-purple), var(--budr-purple-dark))',
                }}
              >
                Start med appen gratis
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="mailto:hej@budrcare.dk?subject=Demo af BUDR"
                className="inline-flex items-center gap-2 rounded-full border-2 px-8 py-4 text-base font-semibold text-white/80 transition-all duration-200 hover:-translate-y-0.5 hover:text-white"
                style={{ borderColor: 'rgba(255,255,255,0.2)' }}
              >
                Book en demo
              </a>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────── */}
        <footer
          className="border-t px-5 py-10"
          style={{ borderColor: 'rgba(0,0,0,0.07)', background: '#f8f9fc' }}
        >
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <AppLogo size={28} />
                <div>
                  <p className="text-sm font-bold text-slate-800">BUDR</p>
                  <p className="text-xs text-slate-400">Fremtidens socialpsykiatri</p>
                </div>
              </div>
              {/* Links */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                <a href="mailto:hej@budrcare.dk" className="hover:text-slate-800 transition-colors">
                  hej@budrcare.dk
                </a>
                <Link href="/privacy" className="hover:text-slate-800 transition-colors">
                  Privatlivspolitik
                </Link>
                <Link href="/cookies" className="hover:text-slate-800 transition-colors">
                  Cookies
                </Link>
                <Link href="/terms" className="hover:text-slate-800 transition-colors">
                  Vilkår
                </Link>
                <a
                  href="https://www.linkedin.com/company/budr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-800 transition-colors"
                >
                  LinkedIn
                </a>
              </div>
            </div>
            <div
              className="mt-6 border-t pt-6 text-center text-xs text-slate-400"
              style={{ borderColor: 'rgba(0,0,0,0.06)' }}
            >
              © {new Date().getFullYear()} BUDR. Alle rettigheder forbeholdes.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

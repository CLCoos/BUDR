'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   useInView — fires once when element enters viewport
───────────────────────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
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
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible] as const;
}

/* ─────────────────────────────────────────────────────────────
   Animated scene wrapper — fades + slides up on enter
───────────────────────────────────────────────────────────── */
function Scene({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, visible] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   The page
───────────────────────────────────────────────────────────── */
export default function AppPage() {
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="bg-[#08080f] text-white antialiased font-sans overflow-x-hidden">
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.18); opacity: 0.8; }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(80px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(80px) rotate(-360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .ticker-track { animation: ticker 22s linear infinite; }
      `}</style>

      {/* ── Back nav ──────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Tilbage
        </Link>
        <Link
          href="/care-portal-dashboard"
          className="rounded-full px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: '#1D9E75' }}
        >
          Care Portal →
        </Link>
      </div>

      {/* ══════════════════════════════════════════════
          SCENE 1 — Hero
      ══════════════════════════════════════════════ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        {/* Background glow orb */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(127,119,221,0.25) 0%, transparent 70%)',
            animation: 'breathe 6s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(167,139,250,0.35) 0%, transparent 70%)',
            animation: 'breathe 4s ease-in-out infinite 1s',
          }}
        />

        <div
          style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 1.2s ease, transform 1.2s ease',
          }}
        >
          <p
            className="mb-6 text-sm font-semibold uppercase tracking-[0.25em]"
            style={{ color: '#A78BFA' }}
          >
            BUDR App
          </p>
          <h1 className="mx-auto max-w-3xl text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
            Hvad sker der,{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #7F77DD 40%, #60A5FA 100%)',
              }}
            >
              når borgeren
            </span>{' '}
            er alene?
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-xl leading-relaxed text-white/55">
            En app der er der. Altid. Ikke som et skema — som en ledsager.
          </p>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{
            opacity: heroVisible ? 0.4 : 0,
            transition: 'opacity 2s ease 1.5s',
          }}
        >
          <span className="text-xs uppercase tracking-widest text-white/40">Scroll</span>
          <div className="h-10 w-px bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SCENE 2 — Problemet
      ══════════════════════════════════════════════ */}
      <section className="relative flex min-h-screen items-center overflow-hidden px-6 py-32">
        <div className="mx-auto max-w-5xl">
          <Scene delay={0}>
            <p
              className="mb-4 text-sm font-semibold uppercase tracking-[0.2em]"
              style={{ color: '#F472B6' }}
            >
              Problemet
            </p>
          </Scene>
          <Scene delay={120}>
            <h2 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              De svære timer sker ikke i <span className="text-white/30">arbejdstiden.</span>
            </h2>
          </Scene>
          <Scene delay={240}>
            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-white/50">
              Kl. 02:47 om natten. Tankerne kører. Ingen er på vagt. Borgeren sidder alene med
              noget, der er svært at sætte ord på. Næste morgen er det væk — men det var der.
            </p>
          </Scene>
          <Scene delay={360}>
            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/50">
              Som pædagog i socialpsykiatrien kender du det. Du kan ikke være der altid. Men din
              indsats kan godt være det.
            </p>
          </Scene>

          {/* Clock graphic */}
          <Scene delay={200} className="mt-16">
            <div className="flex items-center gap-6">
              <div
                className="flex h-24 w-24 flex-col items-center justify-center rounded-full border border-white/10"
                style={{ background: 'rgba(244,114,182,0.06)' }}
              >
                <span className="text-3xl font-black tabular-nums" style={{ color: '#F472B6' }}>
                  02
                </span>
                <span className="text-xs text-white/30 tracking-widest">:47</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-white/70">Ingen er på vagt.</p>
                <p className="text-base text-white/35">Borgeren er alene med sine tanker.</p>
              </div>
            </div>
          </Scene>
        </div>

        {/* Right-side ambient */}
        <div
          className="pointer-events-none absolute right-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(244,114,182,0.4) 0%, transparent 70%)',
          }}
        />
      </section>

      {/* ══════════════════════════════════════════════
          SCENE 3 — Lys AI
      ══════════════════════════════════════════════ */}
      <section
        className="relative flex min-h-screen items-center overflow-hidden px-6 py-32"
        style={{ background: 'linear-gradient(180deg, #08080f 0%, #0d0a1e 50%, #08080f 100%)' }}
      >
        {/* Lys orb visual */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="h-64 w-64 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(127,119,221,0.5) 0%, rgba(167,139,250,0.2) 40%, transparent 70%)',
              animation: 'breathe 5s ease-in-out infinite',
            }}
          />
          {/* Orbiting dots */}
          {[0, 72, 144, 216, 288].map((deg, i) => (
            <div
              key={deg}
              className="absolute left-1/2 top-1/2 h-2 w-2 -ml-1 -mt-1 rounded-full"
              style={{
                backgroundColor: ['#A78BFA', '#60A5FA', '#34D399', '#FB923C', '#F472B6'][i],
                animation: `orbit ${4 + i * 0.6}s linear infinite`,
                animationDelay: `${-i * 0.8}s`,
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="max-w-lg">
            <Scene delay={0}>
              <p
                className="mb-4 text-sm font-semibold uppercase tracking-[0.2em]"
                style={{ color: '#A78BFA' }}
              >
                Løsningen
              </p>
            </Scene>
            <Scene delay={120}>
              <h2 className="text-5xl font-black leading-tight tracking-tight text-white sm:text-6xl">
                Mød{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA, #60A5FA)' }}
                >
                  Lys.
                </span>
              </h2>
            </Scene>
            <Scene delay={240}>
              <p className="mt-7 text-xl leading-relaxed text-white/60">
                En AI-assistent bygget specifikt til borgere i socialpsykiatrien. Lys stiller de
                rigtige spørgsmål, lytter uden at dømme og hjælper borgeren med at sætte ord på det
                svære.
              </p>
            </Scene>
            <Scene delay={360}>
              <p className="mt-5 text-xl leading-relaxed text-white/60">
                Baseret på KRAP og PARK-metodik. Designet i samarbejde med fagfolk. Tilgængelig
                døgnet rundt — præcis når du ikke kan være det.
              </p>
            </Scene>
            <Scene delay={480} className="mt-8 space-y-3">
              {[
                'Taler dansk. Taler menneske.',
                'Aldrig dømmende. Altid til stede.',
                'Bygget over evidensbaseret metodik.',
                'Sender bekymringer direkte til personalet.',
              ].map((t) => (
                <div key={t} className="flex items-center gap-3">
                  <div
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: '#A78BFA',
                      animation: 'pulse-dot 2s ease-in-out infinite',
                    }}
                  />
                  <span className="text-base text-white/60">{t}</span>
                </div>
              ))}
            </Scene>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SCENE 4 — Stemningsregistrering
      ══════════════════════════════════════════════ */}
      <section className="relative flex min-h-screen items-center overflow-hidden px-6 py-32">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Text */}
          <div>
            <Scene delay={0}>
              <p
                className="mb-4 text-sm font-semibold uppercase tracking-[0.2em]"
                style={{ color: '#34D399' }}
              >
                Realtids-indblik
              </p>
            </Scene>
            <Scene delay={120}>
              <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
                Du ser det, <span className="text-white/30">før det eskalerer.</span>
              </h2>
            </Scene>
            <Scene delay={240}>
              <p className="mt-7 text-lg leading-relaxed text-white/55">
                Borgeren trykker på et humør. Du modtager et trafiklys i Care Portal. Ingen
                journaler der skal udfyldes. Ingen ventetid. Bare en direkte, menneskelig
                forbindelse — formidlet digitalt.
              </p>
            </Scene>
            <Scene delay={360}>
              <p className="mt-5 text-lg leading-relaxed text-white/55">
                Rødt trafiklys gør uro synlig med det samme, så I kan følge op efter jeres kriseplan
                — inkl. notifikationer, når det er slået til for jeres bosted.
              </p>
            </Scene>
          </div>

          {/* Traffic light visual */}
          <Scene delay={200} className="flex justify-center lg:justify-end">
            <div
              className="rounded-3xl border border-white/8 p-8"
              style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)' }}
            >
              <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-white/30">
                Borgers stemning · i dag
              </p>
              <div className="flex flex-col gap-4">
                {[
                  { label: 'Godt', color: '#34D399', glow: 'rgba(52,211,153,0.4)', active: false },
                  { label: 'Okay', color: '#FB923C', glow: 'rgba(251,146,60,0.4)', active: true },
                  {
                    label: 'Svært',
                    color: '#F87171',
                    glow: 'rgba(248,113,113,0.4)',
                    active: false,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-4 rounded-2xl border px-6 py-4"
                    style={{
                      borderColor: item.active ? `${item.color}60` : 'rgba(255,255,255,0.06)',
                      backgroundColor: item.active ? `${item.color}12` : 'transparent',
                    }}
                  >
                    <div
                      className="h-5 w-5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: item.color,
                        boxShadow: item.active ? `0 0 16px ${item.glow}` : 'none',
                        animation: item.active ? 'pulse-dot 2s ease-in-out infinite' : 'none',
                      }}
                    />
                    <span
                      className="text-lg font-semibold"
                      style={{ color: item.active ? item.color : 'rgba(255,255,255,0.3)' }}
                    >
                      {item.label}
                    </span>
                    {item.active && (
                      <span className="ml-auto text-xs font-medium" style={{ color: item.color }}>
                        Registreret kl. 14:23
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div
                className="mt-6 rounded-xl border border-white/6 px-4 py-3 text-sm"
                style={{ backgroundColor: 'rgba(52,211,153,0.06)' }}
              >
                <span className="text-white/40">→ Care Portal: </span>
                <span className="text-white/70">Trafiklys opdateret for 3 borgere</span>
              </div>
            </div>
          </Scene>
        </div>

        <div
          className="pointer-events-none absolute left-0 top-1/2 h-[600px] w-[400px] -translate-y-1/2 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(52,211,153,0.6) 0%, transparent 70%)',
          }}
        />
      </section>

      {/* ══════════════════════════════════════════════
          SCENE 5 — Daglige udfordringer
      ══════════════════════════════════════════════ */}
      <section
        className="relative flex min-h-screen items-center overflow-hidden px-6 py-32"
        style={{ background: 'linear-gradient(180deg, #08080f 0%, #100c04 50%, #08080f 100%)' }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl">
            <Scene delay={0}>
              <p
                className="mb-4 text-sm font-semibold uppercase tracking-[0.2em]"
                style={{ color: '#FB923C' }}
              >
                Daglig mestring
              </p>
            </Scene>
            <Scene delay={120}>
              <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
                Små sejre.
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #FB923C, #FBBF24)' }}
                >
                  Stor forskel.
                </span>
              </h2>
            </Scene>
            <Scene delay={240}>
              <p className="mt-7 text-lg leading-relaxed text-white/55">
                Udfordringer tilpasset borgerens energiniveau den dag. Fra{' '}
                <span className="whitespace-nowrap">«Drik et glas vand»</span> til{' '}
                <span className="whitespace-nowrap">«Gå en tur på 15 minutter»</span> — altid inden
                for rækkevidde. Hver gennemført opgave giver XP og en konkret fornemmelse af at
                rykke sig.
              </p>
            </Scene>
          </div>

          {/* Challenge cards */}
          <Scene delay={300} className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { emoji: '💧', title: 'Drik et glas vand', xp: 5, energy: 1, color: '#60A5FA' },
              { emoji: '🌿', title: 'Frisk luft i 5 min', xp: 10, energy: 2, color: '#34D399' },
              { emoji: '🚶', title: 'Gå en tur på 15 min', xp: 20, energy: 3, color: '#FB923C' },
              { emoji: '📞', title: 'Ring til en ven', xp: 20, energy: 3, color: '#F472B6' },
              { emoji: '🎨', title: 'Kreativ aktivitet', xp: 20, energy: 3, color: '#A78BFA' },
              { emoji: '💪', title: 'Træn i 30 minutter', xp: 40, energy: 5, color: '#FBBF24' },
            ].map((c, i) => (
              <div
                key={c.title}
                className="flex items-center gap-3 rounded-2xl border px-4 py-3"
                style={{
                  borderColor: `${c.color}25`,
                  backgroundColor: `${c.color}08`,
                  opacity: i < 3 ? 1 : 0.45,
                }}
              >
                <span className="text-2xl">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.title}</p>
                  <p className="text-xs" style={{ color: c.color }}>
                    Energi {c.energy}
                  </p>
                </div>
                <span
                  className="text-xs font-bold rounded-full px-2 py-0.5 flex-shrink-0"
                  style={{ backgroundColor: `${c.color}22`, color: c.color }}
                >
                  +{c.xp} XP
                </span>
              </div>
            ))}
          </Scene>
        </div>

        <div
          className="pointer-events-none absolute right-0 top-1/2 h-[500px] w-[400px] -translate-y-1/2 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(251,146,60,0.5) 0%, transparent 70%)',
          }}
        />
      </section>

      {/* ══════════════════════════════════════════════
          SCENE 6 — Journal + KRAP
      ══════════════════════════════════════════════ */}
      <section className="relative flex min-h-screen items-center overflow-hidden px-6 py-32">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Journal mockup */}
          <Scene delay={100} className="order-2 lg:order-1">
            <div
              className="rounded-3xl border border-white/8 p-6"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: '#A78BFA' }}
                  >
                    Journal · i dag
                  </p>
                  <p className="text-sm text-white/40 mt-0.5">Mandag 31. marts</p>
                </div>
                <div
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold"
                  style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}
                >
                  7/10
                </div>
              </div>

              <div
                className="rounded-xl border border-white/6 px-4 py-3 mb-3 text-sm text-white/50 leading-relaxed"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                &ldquo;I dag gik det faktisk ret godt. Jeg kom ud og tog en tur. Det hjalp mere end
                jeg troede…&rdquo;
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Krop', val: 'Lidt urolig', col: '#60A5FA' },
                  { label: 'Affekt', val: 'Rolig', col: '#34D399' },
                  { label: 'Rolle', val: 'Aktiv', col: '#FB923C' },
                  { label: 'Plan', val: 'Gå en tur i morgen', col: '#A78BFA' },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="rounded-xl border px-3 py-2"
                    style={{ borderColor: `${k.col}25`, backgroundColor: `${k.col}08` }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: k.col }}
                    >
                      {k.label}
                    </p>
                    <p className="text-xs text-white/60 mt-0.5">{k.val}</p>
                  </div>
                ))}
              </div>

              <div
                className="mt-4 rounded-xl border border-purple-400/15 p-3"
                style={{ backgroundColor: 'rgba(167,139,250,0.06)' }}
              >
                <p className="text-xs text-white/30 mb-1">Lys&apos; refleksion:</p>
                <p className="text-xs text-white/55 leading-relaxed italic">
                  &ldquo;Du tog et skridt i dag, der betød noget. Det er værd at huske. 🌙&rdquo;
                </p>
              </div>
            </div>
          </Scene>

          {/* Text */}
          <div className="order-1 lg:order-2">
            <Scene delay={0}>
              <p
                className="mb-4 text-sm font-semibold uppercase tracking-[0.2em]"
                style={{ color: '#A78BFA' }}
              >
                Refleksion og dokumentation
              </p>
            </Scene>
            <Scene delay={120}>
              <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA, #F472B6)' }}
                >
                  Borgeren finder sine egne ord.
                </span>
              </h2>
            </Scene>
            <Scene delay={240}>
              <p className="mt-7 text-lg leading-relaxed text-white/55">
                Daglig journal med KRAP-struktur — krop, rolle, affekt og plan. Borgerne reflekterer
                over dagen i et sprog, de selv ejer. Lys opsummerer og anerkender.
              </p>
            </Scene>
            <Scene delay={360}>
              <p className="mt-5 text-lg leading-relaxed text-white/55">
                Journalnotater kan danne udgangspunkt for faglige samtaler og dokumentation efter
                gældende regler (fx serviceloven). Det endelige ansvar for indhold, journalføring og
                myndighedsindberetning ligger hos institutionen — se også{' '}
                <Link href="/terms" className="text-white/75 underline underline-offset-4">
                  vilkår og ansvarsfordeling
                </Link>
                .
              </p>
            </Scene>
          </div>
        </div>

        <div
          className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(167,139,250,0.5) 0%, transparent 70%)',
          }}
        />
      </section>

      {/* ══════════════════════════════════════════════
          SCENE 7 — Støttecirklen
      ══════════════════════════════════════════════ */}
      <section
        className="relative flex min-h-screen items-center overflow-hidden px-6 py-32"
        style={{ background: 'linear-gradient(180deg, #08080f 0%, #0a0f0d 50%, #08080f 100%)' }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl">
            <Scene delay={0}>
              <p
                className="mb-4 text-sm font-semibold uppercase tracking-[0.2em]"
                style={{ color: '#34D399' }}
              >
                Socialt netværk
              </p>
            </Scene>
            <Scene delay={120}>
              <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
                Ingen
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #34D399, #60A5FA)' }}
                >
                  er en ø.
                </span>
              </h2>
            </Scene>
            <Scene delay={240}>
              <p className="mt-7 text-lg leading-relaxed text-white/55">
                Støttecirklen hjælper borgeren med at kortlægge og styrke sit sociale netværk.
                Pårørende, venner, professionelle — alle samlet ét sted. Med ét tryk kan borgeren
                sende en opmuntring eller række ud efter kontakt.
              </p>
            </Scene>
            <Scene delay={360}>
              <p className="mt-5 text-lg leading-relaxed text-white/55">
                Lavt tærskel. Høj effekt. Isolation er en af de største risikofaktorer i
                socialpsykiatrien. Støttecirklen adresserer det direkte.
              </p>
            </Scene>
          </div>

          {/* Orbit visual */}
          <Scene delay={200} className="mt-12">
            <div className="relative flex h-56 w-56 items-center justify-center">
              <div
                className="h-16 w-16 rounded-full border-2 flex items-center justify-center text-2xl"
                style={{
                  borderColor: 'rgba(52,211,153,0.4)',
                  backgroundColor: 'rgba(52,211,153,0.1)',
                }}
              >
                🧑
              </div>
              {/* Ring */}
              <div className="absolute inset-4 rounded-full border border-dashed border-white/10" />
              {/* Contact dots */}
              {[
                { emoji: '👩', angle: 0, color: '#FB923C', label: 'Mor' },
                { emoji: '👧', angle: 72, color: '#F472B6', label: 'Søster' },
                { emoji: '🩺', angle: 144, color: '#34D399', label: 'Terapeut' },
                { emoji: '🧑', angle: 216, color: '#A78BFA', label: 'Ven' },
                { emoji: '🧑‍💼', angle: 288, color: '#60A5FA', label: 'Kollega' },
              ].map((c) => {
                const rad = (c.angle - 90) * (Math.PI / 180);
                const r = 96;
                const x = 112 + r * Math.cos(rad);
                const y = 112 + r * Math.sin(rad);
                return (
                  <div
                    key={c.label}
                    className="absolute flex h-10 w-10 items-center justify-center rounded-full border-2 text-base"
                    style={{
                      left: x - 20,
                      top: y - 20,
                      borderColor: `${c.color}60`,
                      backgroundColor: `${c.color}15`,
                    }}
                  >
                    {c.emoji}
                  </div>
                );
              })}
            </div>
          </Scene>
        </div>

        <div
          className="pointer-events-none absolute left-1/2 bottom-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(ellipse, rgba(52,211,153,0.5) 0%, transparent 70%)',
          }}
        />
      </section>

      {/* ══════════════════════════════════════════════
          SCENE 8 — Care Portal bridge
      ══════════════════════════════════════════════ */}
      <section className="relative flex min-h-[60vh] items-center overflow-hidden px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <Scene delay={0}>
            <p
              className="mb-4 text-sm font-semibold uppercase tracking-[0.2em]"
              style={{ color: '#1D9E75' }}
            >
              Det komplette billede
            </p>
          </Scene>
          <Scene delay={120}>
            <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #1D9E75, #34D399)' }}
              >
                Alt hvad borgeren oplever, lander hos dig i realtid.
              </span>
            </h2>
          </Scene>
          <Scene delay={240}>
            <p className="mx-auto mt-7 max-w-2xl text-xl leading-relaxed text-white/55">
              Care Portal samler stemningsoverblik, trafiklys, opgavegennemførelse og kriseberedskab
              fra alle borgeres apps i ét professionelt dashboard. Du handler, ikke reagerer.
            </p>
          </Scene>
          <Scene delay={360} className="mt-10">
            <Link
              href="/care-portal-dashboard"
              className="inline-flex items-center gap-3 rounded-full px-8 py-4 text-base font-bold text-white shadow-xl transition-all hover:scale-[1.03] hover:opacity-95"
              style={{
                background: 'linear-gradient(135deg, #1D9E75, #059669)',
                boxShadow: '0 0 40px rgba(29,158,117,0.3)',
              }}
            >
              Se Care Portal
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Scene>
        </div>

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(29,158,117,0.08) 0%, transparent 65%)',
          }}
        />
      </section>

      {/* ══════════════════════════════════════════════
          SCROLLING TICKER
      ══════════════════════════════════════════════ */}
      <div className="overflow-hidden border-y border-white/5 py-4 bg-white/[0.02]">
        <div className="ticker-track flex gap-12 whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-12">
              {[
                '📱 Lys AI-assistent',
                '🌡️ Stemningsregistrering',
                '⚡ Daglige udfordringer',
                '📓 Journal & KRAP',
                '🤝 Støttecirklen',
                '🌸 Ressourceblomst',
                '🎯 Måltrappe',
                '🛡️ Kriseberedskab',
                '🏥 Care Portal integration',
                '🔒 Persondata efter GDPR',
              ].map((item) => (
                <span key={item} className="text-sm font-medium text-white/25">
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SCENE 9 — Download CTA
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-6 py-32">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(127,119,221,0.12) 0%, transparent 65%)',
          }}
        />

        <div className="relative mx-auto max-w-4xl text-center">
          <Scene delay={0}>
            <h2 className="text-5xl font-black leading-tight text-white sm:text-6xl">
              Klar til at give{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA, #60A5FA)' }}
              >
                dine borgere en bedre hverdag?
              </span>
            </h2>
          </Scene>

          <Scene delay={200}>
            <p className="mx-auto mt-6 max-w-xl text-xl leading-relaxed text-white/50">
              BUDR kører som webapp i browseren (native apps til App Store og Google Play er under
              udarbejdelse).
            </p>
          </Scene>

          <Scene
            delay={300}
            className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/park-hub"
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #A78BFA, #7F77DD)',
                boxShadow: '0 0 32px rgba(127,119,221,0.35)',
              }}
            >
              Åbn borger-webapp
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/care-portal-demo"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-base font-semibold text-white/85 transition-all hover:bg-white/5"
            >
              Se Care Portal-demo
            </Link>
          </Scene>

          <Scene delay={400}>
            <p className="mt-12 text-center text-sm text-white/25">
              Spørgsmål?{' '}
              <a
                href="mailto:hej@budrcare.dk"
                className="text-white/45 underline underline-offset-4"
              >
                hej@budrcare.dk
              </a>
              {' · '}
              <Link href="/privacy" className="text-white/45 underline underline-offset-4">
                Privatliv
              </Link>
              {' · '}
              <Link href="/terms" className="text-white/45 underline underline-offset-4">
                Vilkår
              </Link>
            </p>
          </Scene>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-white/5 px-6 py-8 text-center">
        <p className="text-xs text-white/20">
          © {new Date().getFullYear()} BUDR · Fremtidens socialpsykiatri
        </p>
      </div>
    </div>
  );
}

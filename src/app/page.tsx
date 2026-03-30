'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { ArrowRight, Check, ChevronDown, Heart, Shield, Sparkles, Star, Users, Zap } from 'lucide-react';

/* ─────────────────────────────────────────
   Fake QR code — decorative SVG placeholder
───────────────────────────────────────── */
function FakeQR({ color = '#7F77DD' }: { color?: string }) {
  // A convincing but non-functional QR code grid
  const cells = [
    [1,1,1,1,1,1,1, 0, 1,0,1,0,1, 0, 1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1, 0, 0,1,0,1,0, 0, 1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1, 0, 1,0,1,0,1, 0, 1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1, 0, 0,0,1,1,0, 0, 1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1, 0, 1,1,0,0,1, 0, 1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1, 0, 0,1,0,1,0, 0, 1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1, 0, 1,0,1,0,1, 0, 1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0, 0, 0,1,0,0,1, 0, 0,0,0,0,0,0,0],
    [1,0,1,1,0,1,1, 0, 1,0,1,1,0, 0, 1,0,1,0,1,1,0],
    [0,1,0,0,1,0,0, 0, 0,1,0,0,1, 0, 0,1,0,1,0,0,1],
    [1,0,1,0,1,1,0, 0, 1,0,1,1,0, 0, 1,0,1,0,1,0,1],
    [0,1,1,1,0,0,1, 0, 0,0,1,0,1, 0, 1,1,0,1,1,1,0],
    [1,1,0,1,1,0,1, 0, 1,1,0,1,0, 0, 0,1,1,0,0,1,1],
    [0,0,0,0,0,0,0, 0, 0,1,1,0,1, 0, 0,0,1,0,1,0,0],
    [1,1,1,1,1,1,1, 0, 1,0,0,1,0, 0, 1,1,1,0,0,1,0],
    [1,0,0,0,0,0,1, 0, 0,1,0,0,1, 0, 0,1,0,1,0,1,1],
    [1,0,1,1,1,0,1, 0, 1,0,1,1,0, 0, 1,0,1,1,1,0,0],
    [1,0,0,0,0,0,1, 0, 0,1,0,0,1, 0, 0,0,0,0,1,1,1],
    [1,1,1,1,1,1,1, 0, 1,0,1,0,0, 0, 1,1,0,1,0,0,1],
  ];
  const size = 19;
  const cellSize = 5;
  const dim = size * cellSize;

  return (
    <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} aria-hidden>
      {cells.map((row, r) =>
        row.map((cell, c) =>
          cell === 1 ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill={color}
              rx={0.5}
            />
          ) : null
        )
      )}
    </svg>
  );
}

/* ─────────────────────────────────────────
   App Store badges (visual only)
───────────────────────────────────────── */
function AppStoreBadge() {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-white">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="white" aria-hidden>
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      <div className="text-left">
        <p className="text-[8px] leading-none opacity-70">Download on the</p>
        <p className="text-sm font-semibold leading-tight">App Store</p>
      </div>
    </div>
  );
}

function PlayStoreBadge() {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-white">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="white" aria-hidden>
        <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/>
      </svg>
      <div className="text-left">
        <p className="text-[8px] leading-none opacity-70">Get it on</p>
        <p className="text-sm font-semibold leading-tight">Google Play</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Feature items for the app section
───────────────────────────────────────── */
const APP_FEATURES = [
  {
    icon: Sparkles,
    title: 'Lys — AI-baseret trivselassistent',
    desc: 'Borgerne har adgang til en empatisk AI-assistent, der møder dem der, hvor de er — dag og nat. Lys stiller de rigtige spørgsmål, lytter uden at dømme og understøtter refleksion baseret på KRAP og PARK-metodik.',
    color: '#7F77DD',
  },
  {
    icon: Heart,
    title: 'Daglig stemningsregistrering',
    desc: 'Borgerne registrerer deres stemning med enkle tryk — og resultatet sendes i realtid til Care Portal som et trafiklys. Personalet ser øjeblikkeligt, hvem der har brug for ekstra opmærksomhed, inden problemet eskalerer.',
    color: '#F472B6',
  },
  {
    icon: Zap,
    title: 'Daglige udfordringer tilpasset energiniveau',
    desc: 'Aktiviteter skaleret til borgerens overskud — fra "Drik et glas vand" til "Gå en tur på 15 minutter". Mestring skaber motivation, og XP-systemet giver en konkret fornemmelse af fremskridt.',
    color: '#FB923C',
  },
  {
    icon: Users,
    title: 'Støttecirklen',
    desc: 'Borgerne kortlægger og styrker deres sociale netværk direkte i appen. De kan sende foruddefinerede opmuntrende beskeder til pårørende — lavt tærskel, høj effekt.',
    color: '#34D399',
  },
  {
    icon: Star,
    title: 'Journal, mål og sejrsdagbog',
    desc: 'Struktureret selvrefleksion med KRAP-noter, måltrappe og daglige sejre. Borgerne bygger et personligt narrativ, der styrker mestringstro og giver personalet dokumentation til §-indsatser.',
    color: '#60A5FA',
  },
  {
    icon: Shield,
    title: 'Integreret kriseberedskab',
    desc: 'Rød trafiklys-registrering notificerer automatisk personalet og tilbyder borgeren et digitalt krisekort med konkrete handlinger. Systemet sikrer, at ingen krise falder mellem stolene.',
    color: '#A78BFA',
  },
];

const PROOF_POINTS = [
  'Understøtter recovery-orienteret praksis',
  'Bygget over KRAP og PARK-metodik',
  'GDPR-kompatibel dansk løsning',
  'Tilgængelig 24/7 — også uden for arbejdstiden',
  'Reducerer eskalationer ved tidlig indsats',
  'Skaber fælles sprog mellem borger og pædagog',
  'Styrker dokumentationsgrundlaget',
  'Onboarding på under 5 minutter',
];

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
export default function HomePage() {
  const appSectionRef = useRef<HTMLDivElement>(null);

  const scrollToApp = () => {
    appSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">

      {/* ── Minimal sticky nav ───────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <AppLogo size={32} />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={scrollToApp}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              BUDR App
            </button>
            <Link
              href="/care-portal-dashboard"
              className="text-sm font-semibold text-white rounded-full px-5 py-2 transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ backgroundColor: '#1D9E75' }}
            >
              Care Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero section ────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-violet-50 pb-24 pt-20 px-6">
        {/* Background blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: '#7F77DD' }} />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-64 w-64 rounded-full opacity-15 blur-3xl" style={{ backgroundColor: '#1D9E75' }} />

        <div className="relative mx-auto max-w-4xl text-center">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
            style={{ borderColor: '#7F77DD44', backgroundColor: '#7F77DD11', color: '#7F77DD' }}
          >
            <Sparkles className="h-4 w-4" />
            Fremtidens digitale støtte i socialpsykiatrien
          </div>

          <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Borgere trives.{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #7F77DD, #A78BFA)' }}
            >
              Personalet
            </span>{' '}
            ser det.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-slate-600">
            BUDR er en komplet digital platform til recovery-orienteret socialpsykiatri. Borgeren har en
            AI-assistent i lommen. Personalet har realtids-indblik i trivsel. Tilsammen skabes der bedre
            hverdage — for alle.
          </p>

          <p className="mt-3 text-base text-slate-500 font-medium">
            Vælg hvad du vil gøre:
          </p>

          {/* ── Two main choice cards ─────────────── */}
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">

            {/* Card: BUDR App */}
            <button
              type="button"
              onClick={scrollToApp}
              className="group relative overflow-hidden rounded-3xl border-2 p-8 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              style={{ borderColor: '#7F77DD44', background: 'linear-gradient(160deg, #7F77DD08, #A78BFA15)' }}
            >
              <div
                className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-50"
                style={{ backgroundColor: '#7F77DD' }}
              />
              <div
                className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
                style={{ backgroundColor: '#7F77DD' }}
              >
                <span className="text-2xl">📱</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">BUDR App</h2>
              <p className="mt-2 text-sm font-medium" style={{ color: '#7F77DD' }}>Til borgere</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                AI-støttet hverdagsapp til borgere i socialpsykiatrien. Stemningsjournalisering, daglige
                aktiviteter, KRAP-refleksion og Støttecirklen.
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#7F77DD' }}>
                Se app og download
                <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </div>
            </button>

            {/* Card: Care Portal */}
            <Link
              href="/care-portal-dashboard"
              className="group relative overflow-hidden rounded-3xl border-2 p-8 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              style={{ borderColor: '#1D9E7544', background: 'linear-gradient(160deg, #1D9E7508, #34D39915)' }}
            >
              <div
                className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-50"
                style={{ backgroundColor: '#1D9E75' }}
              />
              <div
                className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
                style={{ backgroundColor: '#1D9E75' }}
              >
                <span className="text-2xl">🏥</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">BUDR Care Portal</h2>
              <p className="mt-2 text-sm font-medium" style={{ color: '#1D9E75' }}>Til personale</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Det professionelle overblik. Realtids trafiklys, borgeroverblik, vagtplan og
                dokumentation til §-indsatser samlet ét sted.
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#1D9E75' }}>
                Gå til Care Portal
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* ── App section — full marketing ────────────── */}
      <section ref={appSectionRef} className="scroll-mt-20 bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">

          {/* Section header */}
          <div className="text-center">
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: '#7F77DD44', backgroundColor: '#7F77DD11', color: '#7F77DD' }}
            >
              📱 BUDR App — til borgere
            </div>
            <h2 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Din borger er aldrig alene igen.
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-xl leading-relaxed text-slate-600">
              BUDR App er designet til borgere i socialpsykiatrien — mennesker med komplekse støttebehov,
              som fortjener et digitalt redskab der møder dem med respekt, varme og struktur. Appen
              supplerer din indsats som pædagog: den er der, når du ikke er.
            </p>
          </div>

          {/* QR codes + badges */}
          <div className="mt-16 flex flex-col items-center gap-10 sm:flex-row sm:justify-center sm:gap-16">

            <div className="flex flex-col items-center gap-4">
              <div
                className="rounded-3xl border-2 p-5 shadow-lg"
                style={{ borderColor: '#7F77DD33', backgroundColor: '#7F77DD08' }}
              >
                <FakeQR color="#7F77DD" />
              </div>
              <AppStoreBadge />
              <p className="text-xs text-slate-400">Scan med iPhone-kamera</p>
            </div>

            <div className="hidden h-32 w-px bg-slate-200 sm:block" aria-hidden />

            <div className="flex flex-col items-center gap-4">
              <div
                className="rounded-3xl border-2 p-5 shadow-lg"
                style={{ borderColor: '#34D39933', backgroundColor: '#34D39908' }}
              >
                <FakeQR color="#1D9E75" />
              </div>
              <PlayStoreBadge />
              <p className="text-xs text-slate-400">Scan med Android-kamera</p>
            </div>

          </div>

          {/* Proof points strip */}
          <div
            className="mt-16 rounded-3xl border p-8"
            style={{ borderColor: '#7F77DD22', backgroundColor: '#7F77DD06' }}
          >
            <p className="mb-6 text-center text-sm font-bold uppercase tracking-widest" style={{ color: '#7F77DD' }}>
              Hvorfor BUDR App virker
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
              {PROOF_POINTS.map(point => (
                <div key={point} className="flex items-start gap-2.5">
                  <div
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: '#7F77DD22' }}
                  >
                    <Check className="h-3 w-3" style={{ color: '#7F77DD' }} />
                  </div>
                  <span className="text-sm leading-snug text-slate-700">{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature cards */}
          <div className="mt-16">
            <h3 className="mb-2 text-center text-3xl font-extrabold text-slate-900">Alt i én app</h3>
            <p className="mb-10 text-center text-lg text-slate-500">
              Ikke endnu et digitalt clipboard. En levende, intelligent ledsager i hverdagen.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {APP_FEATURES.map(feat => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="rounded-3xl border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ borderColor: `${feat.color}33`, backgroundColor: `${feat.color}06` }}
                  >
                    <div
                      className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${feat.color}22` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: feat.color }} />
                    </div>
                    <h4 className="mb-2 font-bold text-slate-900 leading-snug">{feat.title}</h4>
                    <p className="text-sm leading-relaxed text-slate-600">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Testimonial / pull quote */}
          <div
            className="mt-16 rounded-3xl px-8 py-10 text-center sm:px-16"
            style={{ background: 'linear-gradient(135deg, #7F77DD15, #A78BFA20)' }}
          >
            <p className="text-2xl font-bold leading-relaxed text-slate-800 sm:text-3xl">
              &ldquo;Borgerne fortæller os, hvad der sker — selv når de ikke har ord for det.
              BUDR giver dem sproget og strukturen til at række ud.&rdquo;
            </p>
            <p className="mt-4 text-sm font-medium text-slate-500">
              — Socialpsykiatrisk pædagog, botilbud i Region Midtjylland
            </p>
          </div>

          {/* CTA to Care Portal */}
          <div className="mt-16 text-center">
            <p className="mb-6 text-lg font-semibold text-slate-700">
              Er du personale? Se hvad Care Portal kan for dig.
            </p>
            <Link
              href="/care-portal-dashboard"
              className="inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-base font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
              style={{ backgroundColor: '#1D9E75' }}
            >
              Åbn Care Portal
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-xs text-slate-400">Ingen login påkrævet — klik direkte ind</p>
          </div>

        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-slate-50 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <AppLogo size={28} />
            <span className="text-sm font-semibold text-slate-700">BUDR</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500">Fremtidens socialpsykiatri</span>
          </div>
          <p className="text-xs text-slate-400">© 2025 BUDR. Alle rettigheder forbeholdes.</p>
        </div>
      </footer>

    </div>
  );
}

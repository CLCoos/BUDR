'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Phone, ChevronDown, PhoneCall, BellRing } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

type BreathPhase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';

type FacilityContact = {
  id: string;
  label: string;
  phone: string;
  available_hours: string | null;
};

type ConfirmState = { label: string; phone: string } | null;
type AlertUiState = 'idle' | 'confirming' | 'loading' | 'sent' | 'error';

// ── Constants ─────────────────────────────────────────────────────────────────

const PHASES: { phase: BreathPhase; label: string; duration: number; scale: number }[] = [
  { phase: 'inhale', label: 'Træk vejret ind', duration: 4000, scale: 1.5 },
  { phase: 'hold-in', label: 'Hold vejret', duration: 4000, scale: 1.5 },
  { phase: 'exhale', label: 'Pust ud', duration: 6000, scale: 1.0 },
  { phase: 'hold-out', label: 'Pause', duration: 2000, scale: 1.0 },
];

const HOTLINES = [
  { name: 'Livslinien', number: '70 201 201', desc: 'Anonym rådgivning døgnet rundt' },
  {
    name: 'BørneTelefonen (Røde Kors)',
    number: '116 111',
    desc: 'Til dig under 18 — fortrolig linje',
  },
  { name: 'Seniortelefonerne', number: '70 278 278', desc: 'Støtte til ældre og ensomme' },
  { name: 'Selvmordsforebyggelse', number: '70 201 201', desc: 'Specialiseret krisehjælp' },
  { name: 'Angstlinjen', number: '70 200 120', desc: 'Rådgivning om angst og bekymring' },
];

const CARD_BG = 'rgba(255,255,255,0.07)';
const CARD_BRD = '1px solid rgba(255,255,255,0.10)';
const MUTED = 'rgba(255,255,255,0.50)';
const TEXT = '#F0EEF8';

// ── Accordion section ─────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  open,
  onToggle,
  children,
}: {
  icon: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(open ? undefined : 0);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (open) {
      setHeight(el.scrollHeight);
      const t = setTimeout(() => setHeight(undefined), 320);
      return () => clearTimeout(t);
    } else {
      setHeight(el.scrollHeight);
      requestAnimationFrame(() => requestAnimationFrame(() => setHeight(0)));
    }
  }, [open]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: CARD_BG, border: CARD_BRD }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="text-base font-bold" style={{ color: TEXT }}>
            {title}
          </span>
        </div>
        <ChevronDown
          className="h-5 w-5 shrink-0 transition-transform duration-300"
          style={{ color: MUTED, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div
        style={{
          height: height === undefined ? 'auto' : height,
          overflow: 'hidden',
          transition: 'height 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div ref={innerRef} className="px-5 pb-5 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Call row ──────────────────────────────────────────────────────────────────

function CallRow({
  label,
  sub,
  phone,
  emergency,
  onConfirm,
}: {
  label: string;
  sub?: string;
  phone: string;
  emergency?: boolean;
  onConfirm: (label: string, phone: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onConfirm(label, phone)}
      className="w-full flex items-center justify-between rounded-2xl px-4 py-4 text-left transition-all duration-150 active:scale-[0.98]"
      style={{
        backgroundColor: emergency ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${emergency ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.10)'}`,
        minHeight: 56,
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-snug" style={{ color: TEXT }}>
          {label}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            {sub}
          </p>
        )}
      </div>
      <div
        className="ml-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{
          background: emergency
            ? 'linear-gradient(135deg, #EF4444, #DC2626)'
            : 'rgba(255,255,255,0.12)',
        }}
      >
        <Phone className="h-5 w-5 text-white" aria-hidden />
      </div>
    </button>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  state,
  onConfirm,
  onCancel,
}: {
  state: ConfirmState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!state) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.70)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 space-y-4"
        style={{ backgroundColor: '#0F1B2D', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
            >
              <PhoneCall className="h-7 w-7 text-white" />
            </div>
          </div>
          <p className="text-lg font-black" style={{ color: TEXT }}>
            Ring til {state.label}?
          </p>
          <p className="text-base font-semibold" style={{ color: MUTED }}>
            {state.phone}
          </p>
        </div>
        <a
          href={`tel:${state.phone.replace(/\s/g, '')}`}
          onClick={onConfirm}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-black text-white transition-all duration-150 active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            boxShadow: '0 8px 24px rgba(239,68,68,0.40)',
          }}
        >
          <Phone className="h-5 w-5" /> Ring op
        </a>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all duration-150"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: TEXT }}
        >
          Annuller
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  firstName: string;
  facilityId: string | null;
  onClose: () => void;
};

export default function LysKrisekort({ firstName, facilityId, onClose }: Props) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PHASES[0]!.duration / 1000);
  const [openSection, setOpenSection] = useState<'bosted' | 'kriselinjer' | 'noed' | null>(
    'bosted'
  );
  const [contacts, setContacts] = useState<FacilityContact[] | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [alertUiState, setAlertUiState] = useState<AlertUiState>('idle');

  async function handleAlertStaff() {
    setAlertUiState('loading');
    try {
      const res = await fetch('/api/park/crisis-alert', {
        method: 'POST',
        credentials: 'include',
      });
      setAlertUiState(res.ok ? 'sent' : 'error');
    } catch {
      setAlertUiState('error');
    }
  }

  // Breathing
  useEffect(() => {
    const phase = PHASES[phaseIdx]!;
    setSecondsLeft(phase.duration / 1000);
    const tick = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    const advance = window.setTimeout(
      () => setPhaseIdx((i) => (i + 1) % PHASES.length),
      phase.duration
    );
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(advance);
    };
  }, [phaseIdx]);

  // Load facility contacts
  useEffect(() => {
    if (!facilityId) {
      setContacts([]);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setContacts([]);
      return;
    }
    supabase
      .from('facility_contacts')
      .select('id, label, phone, available_hours')
      .eq('facility_id', facilityId)
      .order('sort_order')
      .then(
        ({ data }) => setContacts((data ?? []) as FacilityContact[]),
        () => setContacts([])
      );
  }, [facilityId]);

  const toggle = (s: 'bosted' | 'kriselinjer' | 'noed') =>
    setOpenSection((prev) => (prev === s ? null : s));

  const current = PHASES[phaseIdx]!;

  return (
    <>
      <ConfirmDialog
        state={confirm}
        onConfirm={() => setConfirm(null)}
        onCancel={() => setConfirm(null)}
      />

      {/* Crisis staff-alert confirm overlay */}
      {alertUiState === 'confirming' && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.70)' }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-4"
            style={{ backgroundColor: '#0F1B2D', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-3">
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
                >
                  <BellRing className="h-7 w-7 text-white" />
                </div>
              </div>
              <p className="text-lg font-black" style={{ color: TEXT }}>
                Er du sikker?
              </p>
              <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                Personalet på bostedet modtager en advarsel med det samme.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleAlertStaff()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-black text-white transition-all duration-150 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                boxShadow: '0 8px 24px rgba(239,68,68,0.40)',
              }}
            >
              <BellRing className="h-5 w-5" /> Ja, tilkald hjælp nu
            </button>
            <button
              type="button"
              onClick={() => setAlertUiState('idle')}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all duration-150"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: TEXT }}
            >
              Nej, gå tilbage
            </button>
          </div>
        </div>
      )}

      <div
        className="mx-auto flex w-full max-w-lg flex-col"
        style={{
          minHeight: '100dvh',
          color: TEXT,
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Top bar with back button */}
        <div
          className="flex items-center justify-between px-5 pt-12 pb-4 shrink-0"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, transparent 100%)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/10 active:scale-95"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            ← Tilbage
          </button>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>
            Krise-støtte
          </p>
          <div className="w-20" />
        </div>

        {/* Breathing */}
        <div className="flex flex-col items-center justify-center py-5 gap-5">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: MUTED }}>
            Åndedrætsøvelse
          </p>

          <div
            className="relative flex items-center justify-center"
            style={{ width: 200, height: 200 }}
          >
            {[32, 12, 0].map((offset, i) => (
              <div
                key={i}
                className="absolute rounded-full transition-all"
                style={{
                  width: `${current.scale * 120 + offset}px`,
                  height: `${current.scale * 120 + offset}px`,
                  backgroundColor:
                    i === 0
                      ? 'rgba(99,102,241,0.08)'
                      : i === 1
                        ? 'rgba(99,102,241,0.14)'
                        : undefined,
                  background:
                    i === 2
                      ? 'linear-gradient(135deg,rgba(99,102,241,0.7) 0%,rgba(139,92,246,0.7) 100%)'
                      : undefined,
                  boxShadow: i === 2 ? '0 0 32px rgba(99,102,241,0.4)' : undefined,
                  transitionDuration: `${current.duration}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                {i === 2 && (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-3xl font-black text-white">{secondsLeft}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-xl font-bold text-white">{current.label}</p>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>
              {phaseIdx + 1} / {PHASES.length}
            </p>
          </div>
        </div>

        {/* Message */}
        <div
          className="mx-5 rounded-2xl px-5 py-4 text-center mb-5"
          style={{ backgroundColor: CARD_BG }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.80)' }}>
            Det lyder som en hård stund, {firstName}. Tag det i dit eget tempo — der er ingen
            forventninger.
          </p>
        </div>

        {/* Accordion */}
        <div className="mx-5 space-y-3 mb-5">
          {/* A — Bostedet */}
          <Section
            icon="🏠"
            title="Bostedet"
            open={openSection === 'bosted'}
            onToggle={() => toggle('bosted')}
          >
            {contacts === null ? (
              <p className="text-sm py-2" style={{ color: MUTED }}>
                Indlæser…
              </p>
            ) : contacts.length === 0 ? (
              <div
                className="rounded-xl px-4 py-4 text-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              >
                <p className="text-sm" style={{ color: MUTED }}>
                  Personalet har endnu ikke tilføjet kontakter — spørg en medarbejder
                </p>
              </div>
            ) : (
              contacts.map((c) => (
                <CallRow
                  key={c.id}
                  label={c.label}
                  sub={c.available_hours ?? undefined}
                  phone={c.phone}
                  onConfirm={(l, p) => setConfirm({ label: l, phone: p })}
                />
              ))
            )}
          </Section>

          {/* B — Kriselinjer */}
          <Section
            icon="📞"
            title="Kriselinjer"
            open={openSection === 'kriselinjer'}
            onToggle={() => toggle('kriselinjer')}
          >
            {HOTLINES.map((h) => (
              <CallRow
                key={h.name}
                label={h.name}
                sub={h.desc}
                phone={h.number}
                onConfirm={(l, p) => setConfirm({ label: l, phone: p })}
              />
            ))}
          </Section>

          {/* C — Nødopkald */}
          <Section
            icon="🚨"
            title="Nødopkald"
            open={openSection === 'noed'}
            onToggle={() => toggle('noed')}
          >
            <CallRow
              label="112 — Ambulance / Brand / Politi"
              sub="Akut livsfare"
              phone="112"
              emergency
              onConfirm={(l, p) => setConfirm({ label: l, phone: p })}
            />
            <CallRow
              label="114 — Politi"
              sub="Ikke-akut henvendelse"
              phone="114"
              emergency
              onConfirm={(l, p) => setConfirm({ label: l, phone: p })}
            />
          </Section>
        </div>

        {/* Staff note */}
        <div
          className="mx-5 rounded-2xl px-5 py-3.5 mb-5"
          style={{
            backgroundColor: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
          }}
        >
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(199,210,254,0.85)' }}>
            Personalet kan se, at du har haft det svært i dag — de vil gerne støtte dig.
          </p>
        </div>

        {/* Tilkald hjælp */}
        <div className="mx-5 mb-5">
          {alertUiState === 'idle' && (
            <button
              type="button"
              onClick={() => setAlertUiState('confirming')}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-black text-white transition-all duration-150 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                boxShadow: '0 8px 24px rgba(239,68,68,0.35)',
              }}
            >
              <BellRing className="h-5 w-5" />
              Tilkald hjælp nu
            </button>
          )}

          {alertUiState === 'loading' && (
            <div
              className="w-full flex items-center justify-center rounded-2xl py-4"
              style={{ backgroundColor: 'rgba(239,68,68,0.30)' }}
            >
              <span className="text-base font-bold text-white opacity-70">Sender…</span>
            </div>
          )}

          {alertUiState === 'sent' && (
            <div
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-4"
              style={{
                backgroundColor: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.30)',
              }}
            >
              <span className="text-base font-bold" style={{ color: '#22c55e' }}>
                ✓ Personalet er varslet
              </span>
            </div>
          )}

          {alertUiState === 'error' && (
            <div className="space-y-2">
              <p className="text-xs text-center" style={{ color: 'rgba(239,68,68,0.80)' }}>
                Kunne ikke sende — tjek forbindelsen og prøv igen
              </p>
              <button
                type="button"
                onClick={() => setAlertUiState('confirming')}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-black text-white active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
              >
                <BellRing className="h-5 w-5" /> Prøv igen
              </button>
            </div>
          )}
        </div>

        {/* Back */}
        <div className="mx-5 mb-8">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl py-4 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98]"
            style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            Tilbage til Lys
          </button>
        </div>
      </div>
    </>
  );
}

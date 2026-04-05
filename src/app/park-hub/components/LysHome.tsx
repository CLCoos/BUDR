'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useResidentSession } from '@/hooks/useResidentSession';
import * as dataService from '@/lib/dataService';
import type { LysChatMessage } from '@/app/api/lys-chat/route';
import type { LysFlowOverlay } from '../lib/lysOverlay';
import type { LysPhase, LysThemeTokens } from '../lib/lysTheme';
import type { LysNavTab } from './LysBottomNav';
import LysBeskedTilPersonale from './LysBeskedTilPersonale';
import LysKrisePlan from './LysKrisePlan';
import LysKrisePlanCard from './LysKrisePlanCard';
import FlowerPlant from '@/components/haven/plants/FlowerPlant';
import TreePlant from '@/components/haven/plants/TreePlant';

const COMPANION_MESSAGES = [
  'Hvad bærer du på i dag?',
  'Du er ikke alene. Lys er her for dig.',
  'Hvert lille skridt tæller.',
  'Det er OK ikke at have det godt.',
  'Du gør det godt — bare det at du er her.',
  'Hvad har du brug for lige nu?',
  'Tage et åndedræt. Vi tager det stille.',
];

const ENERGY_OPTIONS = [
  { level: 1, emoji: '😴', label: 'Svært', color: '#EF4444' },
  { level: 2, emoji: '😔', label: 'Dårligt', color: '#F97316' },
  { level: 3, emoji: '😐', label: 'OK', color: '#EAB308' },
  { level: 4, emoji: '🙂', label: 'Godt', color: '#84CC16' },
  { level: 5, emoji: '😁', label: 'Fantastisk', color: '#22C55E' },
];

type Props = {
  firstName: string;
  initials: string;
  residentId: string;
  tokens: LysThemeTokens;
  accent: string;
  phase: LysPhase;
  now: Date;
  reducedMotion: boolean;
  messages: LysChatMessage[];
  loading: boolean;
  sendToLys: (
    text: string,
    extra?: { messagesOverride?: LysChatMessage[]; historyLimit?: number }
  ) => Promise<string | null>;
  speakSafe: (text: string) => void;
  onOpenFlow: (flow: LysFlowOverlay) => void;
  onSwitchTab: (tab: LysNavTab) => void;
  moodLabel: string | null;
  moodTraffic: 'groen' | 'gul' | 'roed' | null;
  moodTick: number;
};

// ── Haven widget ─────────────────────────────────────────────────────────────

type GardenPlotMini = {
  id: string;
  plant_type: 'tree' | 'flower' | 'herb' | 'bush' | 'vegetable';
  plant_name: string;
  growth_stage: 0 | 1 | 2 | 3 | 4;
};

const MINI_ACCENTS: Record<string, string> = {
  tree: '#1D9E75',
  flower: '#F59E0B',
  herb: '#10B981',
  bush: '#7F77DD',
  vegetable: '#EF4444',
};

// Simple SVG plant for empty state
function PlantSvg() {
  return (
    <svg viewBox="0 0 40 48" fill="none" className="h-10 w-10">
      <path
        d="M20 42 C20 42 20 22 20 16"
        stroke="var(--lys-green)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M20 26 C15 21 8 23 8 16 C8 16 18 16 20 26" fill="var(--lys-green)" opacity="0.55" />
      <path
        d="M20 31 C25 25 33 27 33 20 C33 20 23 20 20 31"
        fill="var(--lys-green)"
        opacity="0.8"
      />
      <circle cx="20" cy="44" r="2.5" fill="var(--lys-green)" opacity="0.25" />
    </svg>
  );
}

function HavenWidget({
  residentId,
  storageMode,
  onNavigate,
}: {
  residentId: string;
  storageMode: 'supabase' | 'local';
  onNavigate: () => void;
}) {
  const [plots, setPlots] = useState<GardenPlotMini[]>([]);

  useEffect(() => {
    if (!residentId) return;
    void (async () => {
      try {
        const rows = await dataService.getGardenPlots(storageMode, residentId);
        setPlots(
          rows.map((r) => ({
            id: r.id,
            plant_type: r.plant_type,
            plant_name: r.plant_name,
            growth_stage: r.growth_stage,
          }))
        );
      } catch {
        setPlots([]);
      }
    })();
  }, [residentId, storageMode]);

  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full rounded-2xl px-5 py-4 text-left flex items-center gap-4 transition-all duration-150 active:scale-[0.98]"
      style={{
        background: 'linear-gradient(135deg, #0a1f14 0%, #0d2a1a 100%)',
        border: '1px solid rgba(45,212,160,0.15)',
        boxShadow: '0 2px 20px rgba(45,212,160,0.06)',
      }}
    >
      {/* Plant preview */}
      <div className="flex gap-2 shrink-0">
        {plots.length === 0 ? (
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(45,212,160,0.08)',
              animation: 'lysPulse 3s ease-in-out infinite',
            }}
          >
            <PlantSvg />
          </div>
        ) : (
          plots.slice(0, 2).map((p) => (
            <div
              key={p.id}
              className="h-14 w-14 rounded-xl flex items-end justify-center overflow-hidden pb-1"
              style={{ backgroundColor: `${MINI_ACCENTS[p.plant_type] ?? '#2dd4a0'}14` }}
            >
              {p.plant_type === 'tree' ||
              p.plant_type === 'herb' ||
              p.plant_type === 'bush' ||
              p.plant_type === 'vegetable' ? (
                <TreePlant
                  stage={p.growth_stage}
                  accent={MINI_ACCENTS[p.plant_type] ?? '#2dd4a0'}
                />
              ) : (
                <FlowerPlant
                  stage={p.growth_stage}
                  accent={MINI_ACCENTS[p.plant_type] ?? '#2dd4a0'}
                />
              )}
            </div>
          ))
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-bold tracking-widest uppercase mb-0.5"
          style={{ color: 'var(--lys-green)', opacity: 0.7 }}
        >
          Min Have
        </p>
        {plots.length === 0 ? (
          <p className="text-sm font-semibold" style={{ color: 'var(--lys-text)' }}>
            Plant din første blomst
          </p>
        ) : (
          <p className="text-sm font-semibold" style={{ color: 'var(--lys-text)' }}>
            {plots.length} {plots.length === 1 ? 'plante' : 'planter'} vokser
          </p>
        )}
        <p className="text-xs mt-0.5" style={{ color: 'var(--lys-muted)' }}>
          Tryk for at vande og se vækst
        </p>
      </div>
      <span className="text-sm" style={{ color: 'var(--lys-green)' }}>
        →
      </span>
    </button>
  );
}

function greetingLine(phase: LysPhase, name: string): { static: string; italic: string } {
  switch (phase) {
    case 'morning':
      return { static: 'Godmorgen, ', italic: name };
    case 'afternoon':
      return { static: 'Hej igen, ', italic: name };
    case 'evening':
      return { static: 'God aften, ', italic: name };
    default:
      return { static: 'Hej, ', italic: name };
  }
}

type CheckIn = { level: number; label: string; ts: number };

export default function LysHome({
  firstName,
  initials,
  residentId,
  tokens,
  accent,
  phase,
  now,
  reducedMotion,
  messages,
  loading,
  sendToLys,
  speakSafe,
  onOpenFlow,
  onSwitchTab,
  moodLabel,
  moodTick,
}: Props) {
  const router = useRouter();
  const session = useResidentSession();

  const [companionIdx, setCompanionIdx] = useState(0);
  const [lastCheckIn, setLastCheckIn] = useState<CheckIn | null>(null);
  const [planStats, setPlanStats] = useState<{ total: number } | null>(null);
  const [showLysCard, setShowLysCard] = useState(false);
  const [checkInSaving, setCheckInSaving] = useState(false);
  const [krisePlanOpen, setKrisePlanOpen] = useState(false);

  const lastAssistant =
    [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? null;

  // Rotate companion messages
  useEffect(() => {
    const t = window.setInterval(() => {
      setCompanionIdx((i) => (i + 1) % COMPANION_MESSAGES.length);
    }, 7000);
    return () => window.clearInterval(t);
  }, []);

  // Load latest check-in from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('budr_last_checkin');
      if (raw) {
        const d = JSON.parse(raw) as CheckIn;
        if (Date.now() - d.ts < 2 * 60 * 60 * 1000) setLastCheckIn(d);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Fetch plan item count
  useEffect(() => {
    if (!residentId) {
      setPlanStats({ total: 0 });
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('daily_plans')
      .select('plan_items')
      .eq('resident_id', residentId)
      .eq('plan_date', today)
      .maybeSingle()
      .then(
        ({ data }) => {
          const cnt = Array.isArray(data?.plan_items) ? (data!.plan_items as unknown[]).length : 0;
          setPlanStats({ total: cnt });
        },
        () => setPlanStats({ total: 0 })
      );
  }, [residentId]);

  // moodTick effect
  useEffect(() => {
    if (moodTick > 0) setShowLysCard(true);
  }, [moodTick]);

  const handleCheckIn = useCallback(
    async (level: number, label: string) => {
      if (checkInSaving) return;
      setCheckInSaving(true);
      const entry: CheckIn = { level, label, ts: Date.now() };
      setLastCheckIn(entry);
      try {
        localStorage.setItem('budr_last_checkin', JSON.stringify(entry));
      } catch {
        /* ignore */
      }
      await dataService.saveCheckin(session.storageMode, session.activeId || residentId, {
        energy_level: level,
        label,
      });
      await dataService.addXp(session.storageMode, session.activeId || residentId, 'hum_check', 10);
      setCheckInSaving(false);
      void sendToLys(`Jeg har det sådan her: ${label}.`).then(() => setShowLysCard(true));
    },
    [checkInSaving, residentId, sendToLys, session.activeId, session.storageMode]
  );

  const handleLogout = () => {
    document.cookie = 'budr_resident_id=; path=/; max-age=0';
    router.replace('/');
  };

  const todayStr = now.toLocaleDateString('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const greeting = greetingLine(phase, firstName);

  void tokens;
  void accent;
  void moodLabel;

  return (
    <div className="relative" style={{ color: 'var(--lys-text)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6 pb-3">
        <div>
          <h1
            className="leading-tight"
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 26,
              fontWeight: 400,
              color: 'var(--lys-text)',
            }}
          >
            {greeting.static}
            <em>{greeting.italic}</em>
          </h1>
          <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--lys-muted)' }}>
            {todayStr}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-black text-white"
            style={{
              background: 'linear-gradient(135deg, var(--lys-green), rgba(45,212,160,0.6))',
              boxShadow: '0 2px 8px rgba(45,212,160,0.3)',
            }}
            aria-hidden
          >
            {initials}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--lys-muted)' }}
            aria-label="Log ud"
          >
            ×
          </button>
        </div>
      </header>

      <main className="space-y-4 px-5 pb-4">
        {/* Lys companion card */}
        <section
          className="rounded-2xl px-5 py-4 transition-all duration-500"
          style={{
            backgroundColor: 'var(--lys-bg3)',
            border: '1px solid var(--lys-border)',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-bold tracking-widest uppercase mb-2"
                style={{ color: 'var(--lys-green)', opacity: 0.8 }}
              >
                Lys
              </p>
              <p
                key={companionIdx}
                className="text-base font-medium leading-snug"
                style={{
                  color: 'var(--lys-text)',
                  animation: reducedMotion ? undefined : 'lysTabIn 0.4s ease-out',
                }}
              >
                {COMPANION_MESSAGES[companionIdx]}
              </p>
            </div>
            <div
              className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-lg font-black"
              style={{
                backgroundColor: 'var(--lys-green-dim)',
                color: 'var(--lys-green)',
              }}
              aria-hidden
            >
              ✦
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/lys-chat')}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-95"
            style={{
              backgroundColor: 'var(--lys-green-dim)',
              color: 'var(--lys-green)',
              border: '1px solid rgba(45,212,160,0.2)',
            }}
          >
            Skriv til Lys →
          </button>
        </section>

        {/* Humørtjek */}
        <section
          className="rounded-2xl px-5 py-4"
          style={{ backgroundColor: 'var(--lys-bg3)', border: '1px solid var(--lys-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--lys-text)' }}>
              Humørtjek
            </p>
            {lastCheckIn && (
              <span
                className="text-xs font-semibold rounded-full px-2.5 py-1"
                style={{ backgroundColor: 'var(--lys-green-dim)', color: 'var(--lys-green)' }}
              >
                Sidst: {lastCheckIn.label}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {ENERGY_OPTIONS.map((opt) => (
              <button
                key={opt.level}
                type="button"
                onClick={() => void handleCheckIn(opt.level, opt.label)}
                disabled={checkInSaving}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 transition-all duration-150 active:scale-[0.93] disabled:opacity-40"
                style={{
                  backgroundColor:
                    lastCheckIn?.level === opt.level ? 'var(--lys-green-dim)' : 'var(--lys-bg4)',
                  border: `1px solid ${lastCheckIn?.level === opt.level ? 'rgba(45,212,160,0.3)' : 'var(--lys-border)'}`,
                }}
                title={opt.label}
              >
                <span className="text-xl leading-none">{opt.emoji}</span>
                <span
                  className="text-[9px] font-bold uppercase tracking-wide"
                  style={{
                    color:
                      lastCheckIn?.level === opt.level ? 'var(--lys-green)' : 'var(--lys-muted)',
                  }}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Today summary */}
        {planStats !== null && (
          <button
            type="button"
            onClick={() => onSwitchTab('dag')}
            className="w-full rounded-2xl px-4 py-4 text-left flex items-center justify-between gap-4 transition-all duration-150 active:scale-[0.98]"
            style={{ backgroundColor: 'var(--lys-bg3)', border: '1px solid var(--lys-border)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--lys-text)' }}>
                Din dag
              </p>
              {planStats.total > 0 ? (
                <p className="text-xs" style={{ color: 'var(--lys-muted)' }}>
                  {planStats.total} aktiviteter i din plan
                </p>
              ) : (
                <p className="text-xs" style={{ color: 'var(--lys-muted)' }}>
                  🌿 Din dag er fri
                </p>
              )}
            </div>
            <span className="text-sm" style={{ color: 'var(--lys-muted)' }}>
              →
            </span>
          </button>
        )}

        {/* Haven widget */}
        <HavenWidget
          residentId={residentId}
          storageMode={session.storageMode}
          onNavigate={() => router.push(residentId ? `/haven?r=${residentId}` : '/haven')}
        />

        {/* Kriseplan card */}
        <LysKrisePlanCard onOpen={() => setKrisePlanOpen(true)} />

        {/* Besked til personalet */}
        <LysBeskedTilPersonale
          tokens={tokens}
          accent={accent}
          firstName={firstName}
          residentId={residentId}
        />

        {/* AAC-board */}
        <button
          type="button"
          onClick={() => onOpenFlow('aac')}
          className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 text-sm font-semibold transition-all duration-150 active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--lys-bg3)',
            border: '1px solid var(--lys-border)',
            color: 'var(--lys-text)',
          }}
        >
          <span className="text-xl">🗣</span>
          Kommunikationstavle
        </button>

        {/* Sansekasse */}
        <button
          type="button"
          onClick={() => onOpenFlow('sanser')}
          className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 text-sm font-semibold transition-all duration-150 active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--lys-bg3)',
            border: '1px solid var(--lys-border)',
            color: 'var(--lys-text)',
          }}
        >
          <span className="text-xl">🫧</span>
          Ro &amp; sanser
        </button>

        {/* Tal med Lys */}
        <button
          type="button"
          onClick={() => router.push('/lys-chat')}
          className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 text-sm font-semibold transition-all duration-150 active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--lys-bg3)',
            border: '1px solid var(--lys-border)',
            color: 'var(--lys-text)',
          }}
        >
          <span className="text-xl">🎙️</span>
          Tal med Lys
        </button>

        {/* Lys AI response (after mood/check-in) */}
        {showLysCard && (lastAssistant || loading) && (
          <div
            className="rounded-2xl p-5 transition-all duration-300"
            style={{
              backgroundColor: 'var(--lys-bg3)',
              border: '1px solid var(--lys-border)',
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="mt-0.5 h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-base font-black"
                style={{ backgroundColor: 'var(--lys-green-dim)', color: 'var(--lys-green)' }}
                aria-hidden
              >
                ✦
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color: 'var(--lys-green)', opacity: 0.8 }}
                  >
                    Lys
                  </p>
                  {lastAssistant && !loading && (
                    <button
                      type="button"
                      onClick={() => speakSafe(lastAssistant)}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 active:scale-90"
                      style={{ backgroundColor: 'var(--lys-green-dim)', color: 'var(--lys-green)' }}
                      aria-label="Læs højt"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--lys-text)' }}>
                  {loading ? (
                    <span className="flex items-center gap-2" style={{ color: 'var(--lys-muted)' }}>
                      <span className="inline-flex gap-1">
                        {[0, 120, 240].map((d) => (
                          <span
                            key={d}
                            className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{
                              backgroundColor: 'var(--lys-green)',
                              animationDelay: `${d}ms`,
                            }}
                          />
                        ))}
                      </span>
                    </span>
                  ) : (
                    lastAssistant
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Kriseplan bottom sheet */}
      <LysKrisePlan
        open={krisePlanOpen}
        onClose={() => setKrisePlanOpen(false)}
        firstName={firstName}
      />
    </div>
  );
}

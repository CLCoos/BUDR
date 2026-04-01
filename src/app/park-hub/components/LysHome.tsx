'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { LysChatMessage } from '@/app/api/lys-chat/route';
import type { LysFlowOverlay } from '../lib/lysOverlay';
import type { LysPhase, LysThemeTokens } from '../lib/lysTheme';
import type { LysNavTab } from './LysBottomNav';
import LysBeskedTilPersonale from './LysBeskedTilPersonale';
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
  { level: 1, emoji: '😴', label: 'Svært',       sub: 'Har ikke energi til meget',     color: '#EF4444' },
  { level: 2, emoji: '😔', label: 'Dårligt',     sub: 'Det kræver lidt mere i dag',    color: '#F97316' },
  { level: 3, emoji: '😐', label: 'OK',           sub: 'Hverken godt eller skidt',      color: '#EAB308' },
  { level: 4, emoji: '🙂', label: 'Godt',         sub: 'Klar til dagen',                color: '#84CC16' },
  { level: 5, emoji: '😁', label: 'Fantastisk',  sub: 'Fuld energi',                   color: '#22C55E' },
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
    extra?: { messagesOverride?: LysChatMessage[]; historyLimit?: number },
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
  tree: '#1D9E75', flower: '#F59E0B', herb: '#10B981', bush: '#7F77DD', vegetable: '#EF4444',
};

function HavenWidget({
  tokens,
  accent,
  residentId,
  onNavigate,
}: {
  tokens: LysThemeTokens;
  accent: string;
  residentId: string;
  onNavigate: () => void;
}) {
  const [plots, setPlots] = useState<GardenPlotMini[]>([]);
  useEffect(() => {
    if (!residentId) return;
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from('garden_plots')
      .select('id, plant_type, plant_name, growth_stage')
      .eq('resident_id', residentId)
      .order('slot_index')
      .limit(2)
      .then(({ data }) => setPlots((data ?? []) as GardenPlotMini[]), () => {});
  }, [residentId]);

  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full rounded-3xl px-5 py-4 text-left flex items-center gap-4 transition-all duration-150 active:scale-[0.98]"
      style={{
        background: `linear-gradient(135deg, ${tokens.gradientFrom} 0%, ${tokens.gradientTo} 100%)`,
        boxShadow: tokens.glowShadow,
      }}
    >
      {/* Mini plant previews */}
      <div className="flex gap-2 shrink-0">
        {plots.length === 0 ? (
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${accent}18` }}>
            🌱
          </div>
        ) : plots.slice(0, 2).map(p => (
          <div
            key={p.id}
            className="h-14 w-14 rounded-2xl flex items-end justify-center overflow-hidden pb-1"
            style={{ backgroundColor: `${MINI_ACCENTS[p.plant_type] ?? accent}14` }}
          >
            {(p.plant_type === 'tree' || p.plant_type === 'herb' || p.plant_type === 'bush' || p.plant_type === 'vegetable')
              ? <TreePlant stage={p.growth_stage} accent={MINI_ACCENTS[p.plant_type] ?? accent} />
              : <FlowerPlant stage={p.growth_stage} accent={MINI_ACCENTS[p.plant_type] ?? accent} />
            }
          </div>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold tracking-widest uppercase mb-0.5" style={{ color: accent }}>Min Have</p>
        {plots.length === 0 ? (
          <p className="text-sm font-semibold">Plant din første blomst 🌱</p>
        ) : (
          <p className="text-sm font-semibold">{plots.length} {plots.length === 1 ? 'plante' : 'planter'} vokser</p>
        )}
        <p className="text-xs mt-0.5" style={{ color: tokens.textMuted }}>Tryk for at vande og se vækst</p>
      </div>
      <span className="text-base" style={{ color: accent }}>→</span>
    </button>
  );
}

function greetingLine(phase: LysPhase, name: string): string {
  switch (phase) {
    case 'morning':   return `Godmorgen, ${name} ☀️`;
    case 'afternoon': return `Hej igen, ${name} 🌤`;
    case 'evening':   return `God aften, ${name} 🌙`;
    default:          return `Hej ${name} 💙`;
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

  const [companionIdx, setCompanionIdx] = useState(0);
  const [lastCheckIn, setLastCheckIn] = useState<CheckIn | null>(null);
  const [planStats, setPlanStats] = useState<{ total: number } | null>(null);
  const [showLysCard, setShowLysCard] = useState(false);
  const [checkInSaving, setCheckInSaving] = useState(false);

  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')?.content ?? null;

  // Rotate companion messages
  useEffect(() => {
    const t = window.setInterval(() => {
      setCompanionIdx(i => (i + 1) % COMPANION_MESSAGES.length);
    }, 7000);
    return () => window.clearInterval(t);
  }, []);

  // Load latest check-in from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('budr_last_checkin');
      if (raw) {
        const d = JSON.parse(raw) as CheckIn;
        // Show last check-in if it was within the last 2 hours
        if (Date.now() - d.ts < 2 * 60 * 60 * 1000) setLastCheckIn(d);
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch plan item count
  useEffect(() => {
    if (!residentId) return;
    const supabase = createClient();
    if (!supabase) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('daily_plans')
      .select('plan_items')
      .eq('resident_id', residentId)
      .eq('plan_date', today)
      .maybeSingle()
      .then(({ data }) => {
        const cnt = Array.isArray(data?.plan_items) ? (data!.plan_items as unknown[]).length : 0;
        setPlanStats({ total: cnt });
      }, () => setPlanStats({ total: 0 }));
  }, [residentId]);

  // moodTick effect
  useEffect(() => {
    if (moodTick > 0) setShowLysCard(true);
  }, [moodTick]);

  const handleCheckIn = useCallback(async (level: number, label: string) => {
    if (checkInSaving) return;
    setCheckInSaving(true);
    const entry: CheckIn = { level, label, ts: Date.now() };
    setLastCheckIn(entry);
    try {
      localStorage.setItem('budr_last_checkin', JSON.stringify(entry));
    } catch { /* ignore */ }

    // Save to Supabase (allow multiple per day — use insert not upsert)
    const supabase = createClient();
    if (supabase && residentId) {
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from('park_daily_checkin').insert({
        resident_id: residentId,
        check_in_date: today,
        energy_level: level,
        label,
      });
      void supabase.rpc('award_xp', {
        p_resident_id: residentId,
        p_activity: 'hum_check',
        p_xp: 10,
      });
    }
    setCheckInSaving(false);
    void sendToLys(`Jeg har det sådan her: ${label}.`).then(() => setShowLysCard(true));
  }, [checkInSaving, residentId, sendToLys]);

  const handleLogout = () => {
    document.cookie = 'budr_resident_id=; path=/; max-age=0';
    router.replace('/');
  };

  const todayStr = now.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });
  const greeting = greetingLine(phase, firstName);

  return (
    <div className="relative font-sans" style={{ color: tokens.text }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h1 className="text-2xl font-black leading-tight tracking-tight">{greeting}</h1>
          <p className="text-sm capitalize mt-0.5" style={{ color: tokens.textMuted }}>{todayStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-black text-white"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
              boxShadow: `0 2px 8px ${accent}44`,
            }}
            aria-hidden
          >
            {initials}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: tokens.textMuted }}
            aria-label="Log ud"
          >
            ×
          </button>
        </div>
      </header>

      <main className="space-y-4 px-5 pb-4">

        {/* Lys companion card */}
        <section
          className="rounded-3xl px-6 py-5 transition-all duration-500"
          style={{
            background: `linear-gradient(150deg, ${tokens.gradientFrom} 0%, ${tokens.gradientTo} 100%)`,
            boxShadow: tokens.glowShadow,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: accent }}>Lys</p>
              <p
                key={companionIdx}
                className="text-base font-semibold leading-snug"
                style={{ animation: reducedMotion ? undefined : 'lysTabIn 0.4s ease-out' }}
              >
                {COMPANION_MESSAGES[companionIdx]}
              </p>
            </div>
            <div
              className="h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-xl font-black text-white"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
                boxShadow: `0 4px 16px ${accent}44`,
              }}
              aria-hidden
            >
              ✦
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/lys-chat')}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white transition-all duration-150 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              boxShadow: `0 4px 12px ${accent}33`,
            }}
          >
            Skriv til Lys →
          </button>
        </section>

        {/* Humørtjek */}
        <section
          className="rounded-3xl px-6 py-5"
          style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold">Humørtjek</p>
            {lastCheckIn && (
              <span
                className="text-xs font-semibold rounded-full px-2.5 py-1"
                style={{ backgroundColor: `${accent}18`, color: accent }}
              >
                Sidst: {lastCheckIn.label}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {ENERGY_OPTIONS.map(opt => (
              <button
                key={opt.level}
                type="button"
                onClick={() => void handleCheckIn(opt.level, opt.label)}
                disabled={checkInSaving}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3.5 transition-all duration-150 active:scale-[0.93] disabled:opacity-40"
                style={{
                  backgroundColor: lastCheckIn?.level === opt.level ? `${opt.color}28` : `${opt.color}12`,
                  border: `1.5px solid ${lastCheckIn?.level === opt.level ? opt.color : `${opt.color}28`}`,
                }}
                title={opt.sub}
              >
                <span className="text-2xl leading-none">{opt.emoji}</span>
                <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: opt.color }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          {lastCheckIn && (
            <p className="text-xs mt-3 text-center" style={{ color: tokens.textMuted }}>
              Du kan tjekke ind igen når som helst
            </p>
          )}
        </section>

        {/* Today summary */}
        {planStats !== null && (
          <button
            type="button"
            onClick={() => onSwitchTab('dag')}
            className="w-full rounded-2xl px-5 py-4 text-left flex items-center justify-between gap-4 transition-all duration-150 active:scale-[0.98]"
            style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold mb-1">Din dag</p>
              {planStats.total > 0 ? (
                <p className="text-sm" style={{ color: tokens.textMuted }}>{planStats.total} aktiviteter i din plan</p>
              ) : (
                <p className="text-sm" style={{ color: tokens.textMuted }}>🌿 Din dag er fri</p>
              )}
            </div>
            <span className="text-lg" style={{ color: accent }}>→</span>
          </button>
        )}

        {/* Haven widget */}
        <HavenWidget tokens={tokens} accent={accent} residentId={residentId} onNavigate={() => router.push('/haven')} />

        {/* Besked til personalet */}
        <LysBeskedTilPersonale tokens={tokens} accent={accent} firstName={firstName} residentId={residentId} />

        {/* Tal med Lys — link to dedicated chat */}
        <button
          type="button"
          onClick={() => router.push('/lys-chat')}
          className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 text-sm font-bold transition-all duration-150 active:scale-[0.98]"
          style={{
            backgroundColor: tokens.cardBg,
            boxShadow: tokens.shadow,
            color: accent,
          }}
        >
          <span className="text-xl">🎙️</span>
          Tal med Lys
        </button>

        {/* Lys AI response (after mood/check-in) */}
        {showLysCard && (lastAssistant || loading) && (
          <div
            className="rounded-3xl p-6 transition-all duration-300"
            style={{
              backgroundColor: tokens.cardBg,
              boxShadow: tokens.shadow,
              border: `1px solid ${accent}18`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="mt-0.5 h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-lg font-black text-white"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
                aria-hidden
              >
                ✦
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: accent }}>Lys</p>
                  {lastAssistant && !loading && (
                    <button
                      type="button"
                      onClick={() => speakSafe(lastAssistant)}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 active:scale-90"
                      style={{ backgroundColor: tokens.accentSoft, color: accent }}
                      aria-label="Læs højt"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-base leading-relaxed" style={{ color: tokens.text }}>
                  {loading ? (
                    <span className="flex items-center gap-2" style={{ color: tokens.textMuted }}>
                      <span className="inline-flex gap-1">
                        {[0, 120, 240].map(d => (
                          <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: accent, animationDelay: `${d}ms` }} />
                        ))}
                      </span>
                    </span>
                  ) : lastAssistant}
                </p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

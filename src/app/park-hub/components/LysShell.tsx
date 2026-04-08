'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useResidentSession } from '@/hooks/useResidentSession';
import { trackEvent } from '@/lib/analytics';
import { tryEarnFirstChatBadge } from '@/lib/residentBadgeSync';
import { getLysPhase, lysTheme } from '../lib/lysTheme';
import type { LysFlowOverlay } from '../lib/lysOverlay';
import { useLysConversation } from '../hooks/useLysConversation';
import { useSpeech } from '../hooks/useSpeech';
import LysBottomNav, { type LysNavTab } from './LysBottomNav';
import { ResidentProvider } from '../context/ResidentContext';
import LysHome from './LysHome';
import LysMigScreen from './LysMigScreen';
import LysDagTab from './LysDagTab';
import LysJournalTab from './LysJournalTab';
import LysStemningskort from './LysStemningskort';
import LysBlomst from './LysBlomst';
import LysTankefanger from './LysTankefanger';
import LysMaaltrappe from './LysMaaltrappe';
import LysDagligSejr from './LysDagligSejr';
import LysSansekasse from './LysSansekasse';
import LysAACBoard from './LysAACBoard';
import LysOnboarding from './LysOnboarding';
import LysStatusChrome from './LysStatusChrome';
import LysKrisekort from './LysKrisekort';
import { createClient } from '@/lib/supabase/client';

type Props = {
  firstName: string;
  initials: string;
  residentId: string;
  facilityId: string | null;
  /** Sandt i demo-tilstand — viser tydelig markering */
  isDemoMode?: boolean;
};

export default function LysShell({
  firstName,
  initials,
  residentId,
  facilityId,
  isDemoMode = false,
}: Props) {
  const [now, setNow] = useState(() => new Date());
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tab, setTab] = useState<LysNavTab>('hjem');
  const [overlay, setOverlay] = useState<LysFlowOverlay | null>(null);
  const [moodLabel, setMoodLabel] = useState<string | null>(null);
  const [moodTraffic, setMoodTraffic] = useState<'groen' | 'gul' | 'roed' | null>(null);
  const [moodRegisteredToday, setMoodRegisteredToday] = useState(false);
  const [moodTick, setMoodTick] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);

  const phase = useMemo(() => getLysPhase(now), [now]);
  const tokens = useMemo(() => lysTheme(phase), [phase]);
  const accent = tokens.accent;

  const session = useResidentSession();

  const onLysAssistantSuccess = useCallback(() => {
    void tryEarnFirstChatBadge(session.storageMode, session.activeId);
  }, [session.storageMode, session.activeId]);

  const { messages, loading, sendToLys, sendCounterThought } = useLysConversation({
    firstName,
    phase,
    moodLabel,
    onAssistantSuccess: onLysAssistantSuccess,
  });

  const { speak } = useSpeech();

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = () => setReducedMotion(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    if (!residentId) return;
    try {
      const k = `budr_ga_lys_session:${residentId}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
      trackEvent('lys_park_session_start', { demo_mode: isDemoMode ? 1 : 0 });
    } catch {
      /* ignore */
    }
  }, [residentId, isDemoMode]);

  useEffect(() => {
    if (!residentId) return;
    let cancelled = false;
    void (async () => {
      try {
        const cacheKey = `budr_simple_mode_${residentId}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached === '1' || cached === '0') {
          if (!cancelled) setSimpleMode(cached === '1');
          return;
        }
        const supabase = createClient();
        if (!supabase) return;
        const { data } = await supabase
          .from('care_residents')
          .select('simple_mode')
          .eq('user_id', residentId)
          .maybeSingle();
        const enabled = Boolean((data as { simple_mode?: boolean } | null)?.simple_mode);
        if (!cancelled) {
          setSimpleMode(enabled);
          sessionStorage.setItem(cacheKey, enabled ? '1' : '0');
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [residentId]);

  const speakSafe = useCallback((t: string) => speak(t, reducedMotion), [speak, reducedMotion]);

  const handleMoodComplete = async (payload: {
    label: string;
    traffic: 'groen' | 'gul' | 'roed';
    note: string;
    moodScore: number;
    voiceTranscript?: string;
    aiSummary?: string;
  }) => {
    setMoodLabel(payload.label);
    setMoodTraffic(payload.traffic);
    setMoodRegisteredToday(true);

    trackEvent('lys_mood_registered', { traffic: payload.traffic });

    toast.success(`📋 Sendt til portalen: Stemning registreret for ${firstName}`);

    if (payload.label === 'Meget svært' || payload.traffic === 'roed') {
      toast.success('📋 Sendt til portalen: Personalet ser, at du har haft det svært');
    }
    try {
      await fetch('/api/park/daily-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood_score: payload.moodScore,
          traffic_light: payload.traffic,
          note: payload.note || undefined,
          voice_transcript: payload.voiceTranscript,
          ai_summary: payload.aiSummary,
        }),
      });
    } catch {
      // Best effort: UI flow should continue even if network is unstable.
    }
    setOverlay(null);
    const note = payload.note ? ` Jeg skrev også: ${payload.note}` : '';
    await sendToLys(`Jeg har det sådan her: ${payload.label}.${note}`);
    setMoodTick((t) => t + 1);
  };

  const openCheckIn = () => {
    setDrawerOpen(false);
    setOverlay('mood');
  };

  const openFromDrawer = (target: 'journal' | 'mig' | 'day' | 'crisis' | 'goals') => {
    setDrawerOpen(false);
    if (target === 'journal') setTab('journal');
    else if (target === 'mig') setTab('mig');
    else if (target === 'day') setTab('dag');
    else if (target === 'crisis') setOverlay('crisis');
    else if (target === 'goals') setOverlay('goals');
  };

  return (
    <ResidentProvider firstName={firstName} initials={initials} residentId={residentId}>
      <div
        className="min-h-dvh font-sans transition-colors duration-300"
        style={{ backgroundColor: '#F7F5F1', color: '#1A1814' }}
      >
        <LysStatusChrome tokens={tokens} isDemoMode={isDemoMode} />
        <div
          className="mx-auto max-w-lg transition-all duration-200"
          style={{ paddingBottom: 'calc(5rem + max(1rem, env(safe-area-inset-bottom, 0px)))' }}
        >
          <div
            className="sticky top-0 z-20 flex items-center justify-between border-b px-5 py-4 backdrop-blur-xl"
            style={{
              backgroundColor: 'rgba(247,245,241,0.92)',
              borderColor: '#E8E3DA',
            }}
          >
            <div
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 22,
                color: '#2D5BE3',
                fontStyle: 'italic',
                lineHeight: 1,
              }}
            >
              lys
            </div>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold"
              style={{
                backgroundColor: '#EBF0FD',
                color: '#1A3FAF',
                borderColor: 'rgba(45,91,227,0.3)',
              }}
            >
              {initials || 'B'}
            </div>
          </div>
          <div
            key={tab}
            style={{
              animation: reducedMotion ? undefined : 'lysTabIn 0.22s ease-out',
              minHeight: 'calc(100dvh - 76px)',
            }}
          >
            {tab === 'hjem' && (
              <LysHome
                firstName={firstName}
                initials={initials}
                residentId={residentId}
                tokens={tokens}
                accent={accent}
                phase={phase}
                now={now}
                reducedMotion={reducedMotion}
                messages={messages}
                loading={loading}
                sendToLys={sendToLys}
                speakSafe={speakSafe}
                onOpenFlow={setOverlay}
                onSwitchTab={setTab}
                moodLabel={moodLabel}
                moodTraffic={moodTraffic}
                moodTick={moodTick}
              />
            )}

            {tab === 'dag' && <LysDagTab tokens={tokens} accent={accent} />}

            {tab === 'journal' && <LysJournalTab tokens={tokens} accent={accent} />}

            {tab === 'mig' && (
              <LysMigScreen
                tokens={tokens}
                accent={accent}
                firstName={firstName}
                initials={initials}
                reducedMotion={reducedMotion}
                flowerFilledThisWeek={false}
                onOpenBlomst={() => setOverlay('flower')}
              />
            )}
          </div>
        </div>

        <style>{`
        @keyframes lysTabIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lysCelebrate {
          0%   { opacity: 0; transform: scale(0.7) translateY(12px); }
          65%  { opacity: 1; transform: scale(1.06) translateY(-3px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes lysPop {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(0.93); }
        }
        .lys-celebrate { animation: lysCelebrate 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .lys-pop        { animation: lysPop 0.18s ease-out; }
      `}</style>

        {overlay === 'mood' && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ backgroundColor: tokens.bg }}
          >
            <LysStemningskort
              tokens={tokens}
              accent={accent}
              firstName={firstName}
              reducedMotion={reducedMotion}
              onBack={() => setOverlay(null)}
              onComplete={handleMoodComplete}
            />
          </div>
        )}

        {overlay === 'flower' && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ backgroundColor: tokens.bg }}
          >
            <LysBlomst
              tokens={tokens}
              accent={accent}
              firstName={firstName}
              reducedMotion={reducedMotion}
              onBack={() => setOverlay(null)}
              onDone={() => setOverlay(null)}
            />
          </div>
        )}

        {overlay === 'thought' && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ backgroundColor: tokens.bg }}
          >
            <LysTankefanger
              tokens={tokens}
              accent={accent}
              firstName={firstName}
              reducedMotion={reducedMotion}
              speak={speakSafe}
              sendCounterThought={sendCounterThought}
              storageMode={session.storageMode}
              activeId={session.activeId}
              onBack={() => setOverlay(null)}
            />
          </div>
        )}

        {overlay === 'goals' && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ backgroundColor: tokens.bg }}
          >
            <LysMaaltrappe
              tokens={tokens}
              accent={accent}
              firstName={firstName}
              reducedMotion={reducedMotion}
              onBack={() => setOverlay(null)}
            />
          </div>
        )}

        {overlay === 'dailyWin' && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ backgroundColor: tokens.bg }}
          >
            <LysDagligSejr
              tokens={tokens}
              accent={accent}
              firstName={firstName}
              onBack={() => setOverlay(null)}
            />
          </div>
        )}

        {overlay === 'sanser' && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ backgroundColor: tokens.bg }}
          >
            <LysSansekasse tokens={tokens} accent={accent} onClose={() => setOverlay(null)} />
          </div>
        )}

        {overlay === 'aac' && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ backgroundColor: tokens.bg }}
          >
            <LysAACBoard
              tokens={tokens}
              accent={accent}
              residentId={residentId}
              onClose={() => setOverlay(null)}
            />
          </div>
        )}

        {overlay === 'crisis' && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ backgroundColor: '#0F1B2D' }}
          >
            <LysKrisekort
              firstName={firstName}
              facilityId={facilityId}
              onClose={() => setOverlay(null)}
            />
          </div>
        )}

        {!overlay && (
          <button
            type="button"
            onClick={() => setOverlay('crisis')}
            className="fixed z-[60] h-14 w-14 rounded-full text-white text-2xl font-black shadow-lg active:scale-95"
            style={{
              right: 20,
              bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
              background: 'linear-gradient(135deg, #C0392B, #B91C1C)',
              boxShadow: '0 4px 20px rgba(192,57,43,0.45)',
            }}
            aria-label="Åbn krisehjælp"
          >
            ⚡
          </button>
        )}

        <LysBottomNav
          active={tab}
          onChange={setTab}
          onCheckIn={openCheckIn}
          onCrisis={() => {
            setDrawerOpen(false);
            setOverlay('crisis');
          }}
          onMore={() => setDrawerOpen((v) => !v)}
          isMoreOpen={drawerOpen}
          showDagReminderDot={!moodRegisteredToday}
          hidden={!!overlay}
          simpleMode={simpleMode}
        />

        {drawerOpen && !overlay && !simpleMode && (
          <>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(26,24,20,0.35)' }}
              aria-label="Luk menu"
            />
            <div
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl border px-5 pb-10 pt-3"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E3DA' }}
            >
              <div
                className="mx-auto mb-4 h-1 w-10 rounded-full"
                style={{ backgroundColor: '#E8E3DA' }}
              />
              <p
                className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: '#A09890' }}
              >
                Alle sektioner
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Vagtplan', icon: '⊙', action: () => openFromDrawer('day') },
                  { label: 'Kriseplan', icon: '⚡', action: () => openFromDrawer('crisis') },
                  { label: 'Mine mål', icon: '◇', action: () => openFromDrawer('goals') },
                  { label: 'Aktiviteter', icon: '✦', action: () => openFromDrawer('day') },
                  { label: 'Journal', icon: '◎', action: () => openFromDrawer('journal') },
                  { label: 'Profil', icon: '◉', action: () => openFromDrawer('mig') },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className="w-full rounded-2xl border px-3 py-3 text-left flex items-center gap-3"
                    style={{ borderColor: '#E8E3DA', backgroundColor: '#FFFFFF' }}
                  >
                    <span
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ backgroundColor: '#EBF0FD', color: '#2D5BE3' }}
                    >
                      {item.icon}
                    </span>
                    <span className="text-[15px]" style={{ color: '#1A1814' }}>
                      {item.label}
                    </span>
                    <span className="ml-auto" style={{ color: '#A09890' }}>
                      ›
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <LysOnboarding
          residentId={residentId}
          tokens={tokens}
          accent={accent}
          reducedMotion={reducedMotion}
          hidden={!!overlay}
          skip={isDemoMode}
        />
      </div>
    </ResidentProvider>
  );
}

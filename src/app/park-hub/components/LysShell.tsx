'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getLysPhase, lysTheme } from '../lib/lysTheme';
import type { LysFlowOverlay } from '../lib/lysOverlay';
import { useLysConversation } from '../hooks/useLysConversation';
import { useSpeech } from '../hooks/useSpeech';
import LysBottomNav, { type LysNavTab } from './LysBottomNav';
import LysHome from './LysHome';
import LysMigScreen from './LysMigScreen';
import LysDagTab from './LysDagTab';
import LysJournalTab from './LysJournalTab';
import LysStemningskort from './LysStemningskort';
import LysBlomst from './LysBlomst';
import LysTankefanger from './LysTankefanger';
import LysMaaltrappe from './LysMaaltrappe';
import LysDagligSejr from './LysDagligSejr';
import LysKrisekort from './LysKrisekort';

type Props = {
  firstName: string;
  initials: string;
  residentId: string;
};

export default function LysShell({ firstName, initials, residentId }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tab, setTab] = useState<LysNavTab>('hjem');
  const [overlay, setOverlay] = useState<LysFlowOverlay | null>(null);
  const [moodLabel, setMoodLabel] = useState<string | null>(null);
  const [moodTraffic, setMoodTraffic] = useState<'groen' | 'gul' | 'roed' | null>(null);
  const [moodRegisteredToday, setMoodRegisteredToday] = useState(false);
  const [moodTick, setMoodTick] = useState(0);

  const phase = useMemo(() => getLysPhase(now), [now]);
  const tokens = useMemo(() => lysTheme(phase), [phase]);
  const accent = tokens.accent;

  const { messages, loading, sendToLys, sendCounterThought } = useLysConversation({
    firstName,
    phase,
    moodLabel,
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

  const speakSafe = useCallback((t: string) => speak(t, reducedMotion), [speak, reducedMotion]);

  const handleMoodComplete = async (payload: {
    label: string;
    traffic: 'groen' | 'gul' | 'roed';
    note: string;
  }) => {
    setMoodLabel(payload.label);
    setMoodTraffic(payload.traffic);
    setMoodRegisteredToday(true);

    toast.success(`📋 Sendt til portalen: Stemning registreret for ${firstName}`);

    if (payload.label === 'Meget svært' || payload.traffic === 'roed') {
      toast.success('📋 Sendt til portalen: Personalet ser, at du har haft det svært');
      setOverlay('crisis');
      return;
    }
    setOverlay(null);
    const note = payload.note ? ` Jeg skrev også: ${payload.note}` : '';
    await sendToLys(`Jeg har det sådan her: ${payload.label}.${note}`);
    setMoodTick(t => t + 1);
  };

  const closeCrisis = () => setOverlay(null);

  const lightBar = phase === 'morning' || phase === 'afternoon';

  return (
    <div className="min-h-dvh font-sans transition-colors duration-300" style={{ backgroundColor: tokens.bg, color: tokens.text }}>
      <div
        className="mx-auto max-w-lg transition-all duration-200"
        style={{ paddingBottom: 'calc(5rem + max(1rem, env(safe-area-inset-bottom, 0px)))' }}
      >
        <div
          key={tab}
          style={{ animation: reducedMotion ? undefined : 'lysTabIn 0.22s ease-out' }}
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
              moodLabel={moodLabel}
              moodTraffic={moodTraffic}
              moodTick={moodTick}
            />
          )}

          {tab === 'dag' && (
            <LysDagTab tokens={tokens} accent={accent} />
          )}

          {tab === 'journal' && (
            <LysJournalTab tokens={tokens} accent={accent} />
          )}

          {tab === 'mig' && (
            <LysMigScreen
              tokens={tokens}
              accent={accent}
              firstName={firstName}
              reducedMotion={reducedMotion}
              flowerFilledThisWeek={false}
              onOpenBlomst={() => setOverlay('flower')}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes lysTabIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {overlay === 'mood' && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: tokens.bg }}>
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
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: tokens.bg }}>
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
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: tokens.bg }}>
          <LysTankefanger
            tokens={tokens}
            accent={accent}
            firstName={firstName}
            reducedMotion={reducedMotion}
            speak={speakSafe}
            sendCounterThought={sendCounterThought}
            onBack={() => setOverlay(null)}
          />
        </div>
      )}

      {overlay === 'goals' && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: tokens.bg }}>
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
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: tokens.bg }}>
          <LysDagligSejr tokens={tokens} accent={accent} firstName={firstName} onBack={() => setOverlay(null)} />
        </div>
      )}

      {overlay === 'crisis' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/90 p-6 pt-12">
          <LysKrisekort firstName={firstName} onClose={closeCrisis} />
        </div>
      )}

      <LysBottomNav
        active={tab}
        onChange={setTab}
        tokens={tokens}
        accent={accent}
        showDagReminderDot={!moodRegisteredToday}
        hidden={!!overlay}
        lightBar={lightBar}
      />
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, MessageCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useResidentSession } from '@/hooks/useResidentSession';
import * as dataService from '@/lib/dataService';
import { trackEvent } from '@/lib/analytics';
import { isLysDemoResidentId } from '@/lib/lysDemoResident';
import { copenhagenOnCallShift } from '@/lib/onCallStaff';
import {
  LYS_QUICK_MOODS,
  moodLabelFromScore,
  nextPlanPoint,
  onShiftLine,
  receiptText,
  type OnCallItem,
  type PlanPoint,
  type StaffMessageStatus,
} from '@/lib/lys/iDag';
import { fetchLysPlanBundle, isPlanItemActiveOnDate, patchLysPlanItem } from '@/lib/lys/planItems';
import type { LysThemeTokens } from '../lib/lysTheme';
import type { LysNavTab } from './LysBottomNav';
import MedicinReminder from './MedicinReminder';
import {
  DEMO_ON_CALL,
  demoCheckinKey,
  LysCard,
  LysLabel,
  lysMoodColors,
  lysSun,
  readDemoStaffMessage,
} from './lysUi';

type Props = {
  firstName: string;
  residentId: string;
  isDemoMode: boolean;
  tokens: LysThemeTokens;
  accent: string;
  now: Date;
  onSwitchTab: (tab: LysNavTab) => void;
  onCheckedIn: (moodLabel: string) => void;
  /** Åbner det lange tjek-ind med stemme og flere ord. */
  onOpenLongCheckin: () => void;
};

function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function clockDa(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
    .replace(':', '.');
}

function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return 'God nat';
  if (h < 10) return 'God morgen';
  if (h < 12) return 'God formiddag';
  if (h < 18) return 'God eftermiddag';
  return 'God aften';
}

/** «I dag»: Lys' forside. Ét spørgsmål, det næste, og hvem der er her. */
export default function LysIDag({
  firstName,
  residentId,
  isDemoMode,
  tokens,
  accent,
  now,
  onSwitchTab,
  onCheckedIn,
  onOpenLongCheckin,
}: Props) {
  const session = useResidentSession();
  const demo = isDemoMode || isLysDemoResidentId(residentId);
  const today = ymdLocal(now);
  const dark = tokens.colorScheme === 'dark';
  const sun = lysSun(dark);
  const moodColors = lysMoodColors(dark);

  // ── Tjek ind ──────────────────────────────────────────────────────────────
  const [checkin, setCheckin] = useState<{ label: string; at: string } | null>(null);
  const [checkinLoaded, setCheckinLoaded] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [again, setAgain] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const key = demoCheckinKey(new Date());
    if (demo) {
      try {
        const raw = localStorage.getItem(key);
        setCheckin(raw ? (JSON.parse(raw) as { label: string; at: string }) : null);
      } catch {
        setCheckin(null);
      }
      setCheckinLoaded(true);
      return;
    }
    void fetch('/api/lys/daily-checkin?days=1', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { checkins: [] }))
      .then((data: { checkins?: { created_at: string; mood_score: number }[] }) => {
        if (cancelled) return;
        const last = (data.checkins ?? []).at(-1);
        setCheckin(
          last ? { label: moodLabelFromScore(last.mood_score), at: last.created_at } : null
        );
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setCheckinLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [demo, today]);

  const sendCheckin = async () => {
    if (picked === null || sending) return;
    const mood = LYS_QUICK_MOODS[picked]!;
    setSending(true);
    try {
      // Demo: intet sendes, tjek-ind gemmes kun i browseren.
      const res = demo
        ? { ok: true }
        : await fetch('/api/lys/daily-checkin', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mood_score: mood.score,
              traffic_light: mood.traffic,
              mood_label: mood.label,
              note: note.trim() || undefined,
            }),
          });
      if (!res.ok) {
        toast.error('Det blev ikke sendt. Prøv igen om lidt.');
        return;
      }
      const saved = { label: mood.label, at: new Date().toISOString() };
      setCheckin(saved);
      if (demo) {
        try {
          localStorage.setItem(demoCheckinKey(new Date()), JSON.stringify(saved));
        } catch {
          /* ignore */
        }
      }
      trackEvent('lys_mood_registered', { traffic: mood.traffic, source: 'i_dag' });
      onCheckedIn(mood.label);
      setPicked(null);
      setNote('');
      setAgain(false);
    } catch {
      toast.error('Ingen forbindelse. Prøv igen om lidt.');
    } finally {
      setSending(false);
    }
  };

  // ── Dagens plan ───────────────────────────────────────────────────────────
  const [plan, setPlan] = useState<PlanPoint[] | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    const date = new Date();
    const local = demo || session.storageMode !== 'supabase';
    const readLocalDone = (): string[] => {
      try {
        const raw = localStorage.getItem(`budr_dag_completed_${today}`);
        return raw ? (JSON.parse(raw) as string[]) : [];
      } catch {
        return [];
      }
    };
    if (local) {
      void dataService
        .getPlanItems('local', demo ? residentId : session.activeId || residentId)
        .then((all) => {
          setPlan(
            all
              .filter((p) =>
                p.recurrence === 'none' ? p.active_from === today : p.active_from <= today
              )
              .map((p) => ({
                id: p.id,
                title: p.title,
                time: (p.time_of_day || '09:00').slice(0, 5),
              }))
          );
          setDone(new Set(readLocalDone()));
        })
        .catch(() => setPlan([]));
      return;
    }
    void fetchLysPlanBundle(today).then((bundle) => {
      setPlan([
        ...bundle.dailyPlanItems.map((item, i) => ({
          id: item.id ?? `plan-${i}`,
          title: item.title,
          time: item.time.slice(0, 5),
        })),
        ...bundle.items
          .filter((row) => isPlanItemActiveOnDate(row, date))
          .map((row) => ({
            id: row.id,
            title: row.title,
            time: String(row.time_of_day).slice(0, 5),
          })),
      ]);
      setDone(new Set([...bundle.completions, ...readLocalDone()]));
    });
  }, [demo, residentId, session.activeId, session.storageMode, today]);

  const markDone = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(`budr_dag_completed_${today}`, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
    if (!demo && session.storageMode === 'supabase') {
      void patchLysPlanItem({ action: 'complete', id, date: today });
    }
  };

  const { next, left, total } = nextPlanPoint(plan ?? [], done, hhmm(now));

  // ── På arbejde nu og kvittering ───────────────────────────────────────────
  const [onCall, setOnCall] = useState<OnCallItem[] | null>(null);
  const [message, setMessage] = useState<StaffMessageStatus | null>(null);
  const shift = copenhagenOnCallShift(now);

  const loadStatus = useCallback(() => {
    if (demo) {
      setOnCall([{ shift, staffName: DEMO_ON_CALL[shift] }]);
      setMessage(readDemoStaffMessage(DEMO_ON_CALL[shift].split(' ')[0]!));
      return;
    }
    void fetch('/api/lys/resident-on-call', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: OnCallItem[] }) => setOnCall(d.items ?? []))
      .catch(() => setOnCall([]));
    void fetch('/api/lys/message-staff', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { latest: null }))
      .then((d: { latest?: StaffMessageStatus | null }) => setMessage(d.latest ?? null))
      .catch(() => undefined);
  }, [demo, shift]);

  useEffect(() => {
    loadStatus();
    const t = window.setInterval(loadStatus, 60_000);
    return () => window.clearInterval(t);
  }, [loadStatus]);

  const shiftLine = onCall ? onShiftLine(onCall, shift) : null;
  const receipt = message ? receiptText(message) : null;

  const showPicker = checkinLoaded && (!checkin || again);

  return (
    <div className="flex flex-col gap-4 px-5 pb-6 pt-5" style={{ color: tokens.text }}>
      <header>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">
          {greeting(now)}, {firstName || 'du'}
        </h1>
        <p
          className="mt-0.5 text-[15px] first-letter:uppercase"
          style={{ color: tokens.textMuted }}
        >
          {now.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>

      {/* 1. Ét spørgsmål */}
      <section
        className="rounded-3xl p-5"
        style={{ backgroundColor: sun.soft, border: `1px solid ${sun.border}` }}
        aria-labelledby="lys-idag-checkin"
      >
        {!checkinLoaded ? (
          <p className="text-[15px]" style={{ color: tokens.textMuted }}>
            Et øjeblik…
          </p>
        ) : !showPicker && checkin ? (
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: accent, color: '#fff' }}
              aria-hidden
            >
              <Check size={22} strokeWidth={2.5} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="lys-idag-checkin" className="text-[17px] font-semibold">
                Du har det {checkin.label.toLowerCase()} i dag
              </h2>
              <p className="text-sm" style={{ color: tokens.textMuted }}>
                Sendt kl. {clockDa(checkin.at)}. Personalet kan se det.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAgain(true)}
              className="min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-semibold"
              style={{ color: tokens.text, textDecoration: 'underline', textUnderlineOffset: 4 }}
            >
              Skift
            </button>
          </div>
        ) : (
          <>
            <h2 id="lys-idag-checkin" className="text-[19px] font-semibold leading-snug">
              Hvordan har du det lige nu?
            </h2>
            <div className="mt-4 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Humør">
              {LYS_QUICK_MOODS.map((m, i) => {
                const on = picked === i;
                return (
                  <button
                    key={m.label}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPicked(i)}
                    className="flex min-h-[84px] flex-col items-center justify-start gap-2 rounded-2xl px-0.5 pt-2 text-center transition-transform active:scale-95"
                    style={{ backgroundColor: on ? tokens.cardBg : 'transparent' }}
                  >
                    <span
                      className="block h-11 w-11 rounded-full"
                      style={{
                        backgroundColor: moodColors[i],
                        outline: on ? `3px solid ${tokens.text}` : 'none',
                        outlineOffset: 2,
                      }}
                      aria-hidden
                    />
                    <span
                      className="text-[12px] leading-tight"
                      style={{
                        fontWeight: on ? 700 : 500,
                        color: on ? tokens.text : tokens.textMuted,
                      }}
                    >
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="mt-4 flex flex-col gap-3">
                <label htmlFor="lys-idag-note" className="text-sm font-medium">
                  Vil du sige lidt mere?{' '}
                  <span style={{ color: tokens.textMuted }}>(du behøver ikke)</span>
                </label>
                <textarea
                  id="lys-idag-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Skriv her, eller brug mikrofonen på tastaturet"
                  className="w-full resize-none rounded-2xl border px-4 py-3 text-[16px] outline-none"
                  style={{
                    backgroundColor: tokens.cardBg,
                    borderColor: tokens.cardBorder,
                    color: tokens.text,
                  }}
                />
                <button
                  type="button"
                  onClick={() => void sendCheckin()}
                  disabled={sending}
                  className="min-h-[52px] rounded-2xl text-[16px] font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: accent }}
                >
                  {sending ? 'Sender…' : 'Send til personalet'}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onOpenLongCheckin}
              className="mt-3 min-h-[40px] text-sm font-medium"
              style={{
                color: tokens.textMuted,
                textDecoration: 'underline',
                textUnderlineOffset: 4,
              }}
            >
              Hellere fortælle med stemmen
            </button>
          </>
        )}
      </section>

      <MedicinReminder residentId={residentId} tokens={tokens} accent={accent} />

      {/* 2. Det næste */}
      <LysCard tokens={tokens} labelledBy="lys-idag-naeste">
        <LysLabel tokens={tokens} id="lys-idag-naeste">
          Det næste
        </LysLabel>
        {plan === null ? (
          <p className="text-[15px]" style={{ color: tokens.textMuted }}>
            Henter din dag…
          </p>
        ) : total === 0 ? (
          <p className="text-[15px]" style={{ color: tokens.textMuted }}>
            Du har ingen plan for i dag. Personalet kan lave den sammen med dig.
          </p>
        ) : next ? (
          <>
            <div className="flex items-baseline gap-3">
              <span className="text-[26px] font-bold tabular-nums leading-none">{next.time}</span>
              <span className="text-[18px] font-semibold leading-snug">{next.title}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => markDone(next.id)}
                className="min-h-[48px] rounded-2xl text-[15px] font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                Klaret
              </button>
              <button
                type="button"
                onClick={() => onSwitchTab('dag')}
                className="min-h-[48px] rounded-2xl text-[15px] font-semibold"
                style={{ backgroundColor: tokens.accentSoft, color: tokens.accentSoftText }}
              >
                Hele min dag
              </button>
            </div>
            <p className="text-sm" style={{ color: tokens.textMuted }}>
              {total - left} af {total} klaret i dag. Det er fint at tage det i dit eget tempo.
            </p>
          </>
        ) : (
          <p className="text-[15px]">
            {left === 0
              ? 'Du har klaret alt på planen i dag. Godt gået.'
              : `Der er ${left} ting tilbage fra tidligere i dag.`}
          </p>
        )}
      </LysCard>

      {/* 3. Hvem er her, og har de set min besked */}
      <LysCard tokens={tokens} labelledBy="lys-idag-her">
        <LysLabel tokens={tokens} id="lys-idag-her">
          Personalet
        </LysLabel>
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: tokens.accentSoft, color: tokens.accentSoftText }}
            aria-hidden
          >
            <Users size={18} />
          </span>
          <p className="text-[16px] font-medium">
            {onCall === null
              ? 'Henter vagter…'
              : (shiftLine ??
                'Der er altid en voksen på bostedet. Tryk Hjælp, hvis du har brug for nogen.')}
          </p>
        </div>
        {receipt && (
          <p
            className="flex items-start gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: receipt.seen ? tokens.accentSoft : sun.soft,
              color: receipt.seen ? tokens.accentSoftText : tokens.text,
            }}
            role="status"
          >
            <MessageCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            {receipt.text}
          </p>
        )}
        <button
          type="button"
          onClick={() => onSwitchTab('skriv')}
          className="flex min-h-[48px] items-center justify-between rounded-2xl px-4 text-[15px] font-semibold"
          style={{ backgroundColor: tokens.accentSoft, color: tokens.accentSoftText }}
        >
          Skriv til personalet
          <ArrowRight size={18} aria-hidden />
        </button>
      </LysCard>
    </div>
  );
}

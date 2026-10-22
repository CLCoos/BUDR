'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Heart,
  LifeBuoy,
  MessageCircle,
  Users,
  Wind,
} from 'lucide-react';
import { toast } from 'sonner';
import { useResidentSession } from '@/hooks/useResidentSession';
import * as dataService from '@/lib/dataService';
import { trackEvent } from '@/lib/analytics';
import { isLysDemoResidentId } from '@/lib/lysDemoResident';
import { copenhagenOnCallShift } from '@/lib/onCallStaff';
import { syncBadgesAfterCheckin } from '@/lib/residentBadgeSync';
import {
  LYS_QUICK_MOODS,
  moodLabelFromScore,
  nextPlanPoint,
  onShiftLine,
  receiptText,
  type OnCallItem,
  type PlanPoint,
} from '@/lib/lys/iDag';
import { fetchLysPlanBundle, isPlanItemActiveOnDate, patchLysPlanItem } from '@/lib/lys/planItems';
import type { LysThemeTokens } from '../lib/lysTheme';
import type { LysFlowOverlay } from '../lib/lysOverlay';
import { useStaffReceipt } from '../hooks/useStaffReceipt';
import type { LysNavTab } from './LysBottomNav';
import type { FortaelTarget } from './LysFortael';
import MedicinReminder from './MedicinReminder';
import { DEMO_ON_CALL, demoCheckinKey, LysCard, LysLabel, lysMoodColors, lysSun } from './lysUi';
import { signalLysSafety } from '@/lib/lys/safetySignal';

type Props = {
  firstName: string;
  residentId: string;
  isDemoMode: boolean;
  tokens: LysThemeTokens;
  accent: string;
  now: Date;
  onSwitchTab: (tab: LysNavTab) => void;
  onCheckedIn: (moodLabel: string) => void;
  onOpenFortael: (target: FortaelTarget | null) => void;
  onOpen: (overlay: LysFlowOverlay) => void;
};

const HARD_MOODS = new Set(['Svært', 'Meget svært']);

/** Nøgle til ugens tilbageblik, så søndagskortet forsvinder, når det er gjort. */
export function weeklyDoneKey(d: Date): string {
  return `budr_lys_uge_${ymdLocal(d)}`;
}

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

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
}

/**
 * «Nu»: Lys' forside. Ét spørgsmål, det næste på planen og hvem der er her.
 * En svær dag skærer alt andet væk. Om aftenen og om søndagen kommer et ekstra kort.
 */
export default function LysNu({
  firstName,
  residentId,
  isDemoMode,
  tokens,
  accent,
  now,
  onSwitchTab,
  onCheckedIn,
  onOpenFortael,
  onOpen,
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
      if ('json' in res) {
        const data = (await res.json().catch(() => ({}))) as { safety?: string };
        signalLysSafety(data.safety);
      }
      if (demo) {
        try {
          localStorage.setItem(demoCheckinKey(new Date()), JSON.stringify(saved));
        } catch {
          /* ignore */
        }
      }
      trackEvent('lys_mood_registered', { traffic: mood.traffic, source: 'nu' });
      onCheckedIn(mood.label);
      void syncBadgesAfterCheckin(session.storageMode, session.activeId || residentId);
      setPicked(null);
      setNote('');
      setAgain(false);
    } catch {
      toast.error('Ingen forbindelse. Prøv igen om lidt.');
    } finally {
      setSending(false);
    }
  };

  // ── Svær dag ──────────────────────────────────────────────────────────────
  const hardKey = `budr_lys_svaer_dag_skjult_${today}`;
  const [hardDismissed, setHardDismissed] = useState(false);
  useEffect(() => setHardDismissed(readFlag(hardKey)), [hardKey]);
  const hardDay = !!checkin && HARD_MOODS.has(checkin.label) && !again && !hardDismissed;

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
  const later = next
    ? [...(plan ?? [])]
        .filter((p) => !done.has(p.id) && p.id !== next.id && p.time > next.time)
        .sort((a, b) => a.time.localeCompare(b.time))
        .slice(0, 4)
    : [];

  // ── Personalet og kvittering ──────────────────────────────────────────────
  const [onCall, setOnCall] = useState<OnCallItem[] | null>(null);
  const shift = copenhagenOnCallShift(now);
  const { status: message } = useStaffReceipt(demo);

  useEffect(() => {
    if (demo) {
      setOnCall([{ shift, staffName: DEMO_ON_CALL[shift] }]);
      return;
    }
    const load = () =>
      void fetch('/api/lys/resident-on-call', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items?: OnCallItem[] }) => setOnCall(d.items ?? []))
        .catch(() => setOnCall([]));
    load();
    const t = window.setInterval(load, 5 * 60_000);
    return () => window.clearInterval(t);
  }, [demo, shift]);

  const shiftLine = onCall ? onShiftLine(onCall, shift) : null;
  const receipt = message ? receiptText(message) : null;

  // ── Aftenkort og søndagskort ──────────────────────────────────────────────
  const evening = now.getHours() >= 18;
  const eveningKey = `budr_lys_aften_${today}`;
  const [eveningDone, setEveningDone] = useState(false);
  const [eveningText, setEveningText] = useState('');
  const [eveningSaving, setEveningSaving] = useState(false);
  useEffect(() => setEveningDone(readFlag(eveningKey)), [eveningKey]);

  const saveEvening = async (privacy: 'private' | 'shared') => {
    const t = eveningText.trim();
    if (!t || eveningSaving) return;
    setEveningSaving(true);
    try {
      await dataService.saveJournalEntry(session.storageMode, session.activeId || residentId, {
        date: new Date().toISOString(),
        mode: 'write',
        text: t,
        privacy,
        prompt: 'Hvad gik godt i dag?',
      });
      writeFlag(eveningKey);
      setEveningDone(true);
      trackEvent('lys_evening_card', { privacy });
    } catch {
      toast.error('Det blev ikke gemt. Prøv igen om lidt.');
    } finally {
      setEveningSaving(false);
    }
  };

  const sunday = now.getDay() === 0;
  const [weeklyDone, setWeeklyDone] = useState(false);
  useEffect(() => setWeeklyDone(readFlag(weeklyDoneKey(now))), [now]);

  const showPicker = checkinLoaded && (!checkin || again);

  const header = (
    <header>
      <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">
        {greeting(now)}, {firstName || 'du'}
      </h1>
      <p className="mt-0.5 text-[15px] first-letter:uppercase" style={{ color: tokens.textMuted }}>
        {now.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
    </header>
  );

  if (hardDay) {
    const big =
      'flex min-h-[84px] items-center gap-4 rounded-3xl px-5 py-4 text-left transition-transform active:scale-[0.98]';
    return (
      <div className="flex flex-col gap-4 px-5 pb-6 pt-5" style={{ color: tokens.text }}>
        {header}
        <section
          className="rounded-3xl p-5"
          style={{ backgroundColor: sun.soft, border: `1px solid ${sun.border}` }}
        >
          <h2 className="text-[21px] font-bold leading-snug">Det er en svær dag</h2>
          <p className="mt-1 text-[16px]">
            Du behøver ikke klare det alene. Personalet kan se, at du har det svært.
          </p>
        </section>
        <button
          type="button"
          onClick={() => onOpenFortael('personale')}
          className={big}
          style={{ backgroundColor: accent, color: '#fff' }}
        >
          <MessageCircle size={28} aria-hidden />
          <span>
            <span className="block text-[19px] font-bold">Tal med personalet</span>
            <span className="block text-[15px] opacity-90">
              {shiftLine ?? 'Der er altid en voksen på bostedet'}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onOpen('sanser')}
          className={`${big} border`}
          style={{ backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder }}
        >
          <Wind size={28} style={{ color: accent }} aria-hidden />
          <span>
            <span className="block text-[19px] font-bold">Find ro</span>
            <span className="block text-[15px]" style={{ color: tokens.textMuted }}>
              Øvelser for kroppen og sanserne
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onOpen('crisis')}
          className={`${big} border`}
          style={{ backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder }}
        >
          <LifeBuoy size={28} style={{ color: '#d9583f' }} aria-hidden />
          <span>
            <span className="block text-[19px] font-bold">Jeg har brug for hjælp nu</span>
            <span className="block text-[15px]" style={{ color: tokens.textMuted }}>
              Din kriseplan og vejrtrækning
            </span>
          </span>
        </button>
        {receipt && (
          <p
            className="flex items-start gap-2 rounded-2xl px-4 py-3 text-[15px] font-medium"
            style={{ backgroundColor: tokens.accentSoft, color: tokens.accentSoftText }}
            role="status"
          >
            <MessageCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
            {receipt.text}
          </p>
        )}
        <div className="flex justify-center gap-6 pt-1">
          <button
            type="button"
            onClick={() => setAgain(true)}
            className="min-h-[44px] text-[15px] font-medium underline underline-offset-4"
            style={{ color: tokens.textMuted }}
          >
            Det går bedre nu
          </button>
          <button
            type="button"
            onClick={() => {
              writeFlag(hardKey);
              setHardDismissed(true);
            }}
            className="min-h-[44px] text-[15px] font-medium underline underline-offset-4"
            style={{ color: tokens.textMuted }}
          >
            Vis resten af Lys
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-5 pb-6 pt-5" style={{ color: tokens.text }}>
      {header}

      {/* 1. Ét spørgsmål */}
      <section
        className="rounded-3xl p-5"
        style={{ backgroundColor: sun.soft, border: `1px solid ${sun.border}` }}
        aria-labelledby="lys-nu-checkin"
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
              <h2 id="lys-nu-checkin" className="text-[17px] font-semibold">
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
            <h2 id="lys-nu-checkin" className="text-[19px] font-semibold leading-snug">
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
                <label htmlFor="lys-nu-note" className="text-sm font-medium">
                  Vil du sige lidt mere?{' '}
                  <span style={{ color: tokens.textMuted }}>(du behøver ikke)</span>
                </label>
                <textarea
                  id="lys-nu-note"
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
            <p className="mt-3 text-sm" style={{ color: tokens.textMuted }}>
              Vil du hellere sige det med dine egne ord, så tryk på Fortæl.
            </p>
          </>
        )}
      </section>

      <MedicinReminder residentId={residentId} tokens={tokens} accent={accent} />

      {/* 2. Aftenkort */}
      {evening && (
        <LysCard tokens={tokens} labelledBy="lys-nu-aften">
          <div className="flex items-center gap-2">
            <Heart size={18} style={{ color: accent }} aria-hidden />
            <h2 id="lys-nu-aften" className="text-[17px] font-semibold">
              Hvad gik godt i dag?
            </h2>
          </div>
          {eveningDone ? (
            <p className="text-[15px]" style={{ color: tokens.textMuted }}>
              Tak. Det er gemt i din dagbog under Min vej.
            </p>
          ) : (
            <>
              <p className="text-[15px]" style={{ color: tokens.textMuted }}>
                Bare én lille ting. Det må gerne være småt.
              </p>
              <textarea
                value={eveningText}
                onChange={(e) => setEveningText(e.target.value)}
                rows={2}
                maxLength={1000}
                aria-labelledby="lys-nu-aften"
                placeholder="Fx: Jeg gik en tur. Jeg fik ringet til min søster."
                className="w-full resize-none rounded-2xl border px-4 py-3 text-[16px] outline-none"
                style={{
                  backgroundColor: tokens.bg,
                  borderColor: tokens.cardBorder,
                  color: tokens.text,
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!eveningText.trim() || eveningSaving}
                  onClick={() => void saveEvening('private')}
                  className="min-h-[48px] rounded-2xl text-[15px] font-semibold text-white disabled:opacity-40"
                  style={{ backgroundColor: accent }}
                >
                  Gem til mig
                </button>
                <button
                  type="button"
                  disabled={!eveningText.trim() || eveningSaving}
                  onClick={() => void saveEvening('shared')}
                  className="min-h-[48px] rounded-2xl text-[15px] font-semibold disabled:opacity-40"
                  style={{ backgroundColor: tokens.accentSoft, color: tokens.accentSoftText }}
                >
                  Del med personalet
                </button>
              </div>
            </>
          )}
        </LysCard>
      )}

      {/* 3. Søndagskort */}
      {sunday && !weeklyDone && (
        <button
          type="button"
          onClick={() => onOpen('weekly')}
          className="flex min-h-[72px] items-center gap-3 rounded-3xl border px-5 py-4 text-left"
          style={{ backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder }}
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: tokens.accentSoft, color: tokens.accentSoftText }}
            aria-hidden
          >
            <CalendarCheck size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">Hvordan har ugen været?</span>
            <span className="block text-sm" style={{ color: tokens.textMuted }}>
              Fem korte spørgsmål om din uge
            </span>
          </span>
          <ArrowRight size={18} style={{ color: tokens.textMuted }} aria-hidden />
        </button>
      )}

      {/* 4. Det næste */}
      <LysCard tokens={tokens} labelledBy="lys-nu-naeste">
        <LysLabel tokens={tokens} id="lys-nu-naeste">
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
            {later.length > 0 && (
              <div className="mt-1 border-t pt-3" style={{ borderColor: tokens.cardBorder }}>
                <p className="mb-1.5 text-sm font-semibold" style={{ color: tokens.textMuted }}>
                  Senere i dag
                </p>
                <ul className="flex flex-col gap-1.5">
                  {later.map((p) => (
                    <li key={p.id} className="flex gap-3 text-[15px]">
                      <span
                        className="w-12 shrink-0 tabular-nums"
                        style={{ color: tokens.textMuted }}
                      >
                        {p.time}
                      </span>
                      <span>{p.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-[15px]">
            {left === 0
              ? 'Du har klaret alt på planen i dag. Godt gået.'
              : `Der er ${left} ting tilbage fra tidligere i dag.`}
          </p>
        )}
      </LysCard>

      {/* 5. Hvem er her, og har de set min besked */}
      <LysCard tokens={tokens} labelledBy="lys-nu-her">
        <LysLabel tokens={tokens} id="lys-nu-her">
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
          onClick={() => onOpenFortael('personale')}
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

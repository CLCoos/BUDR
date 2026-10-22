'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Grid3x3, Lock, MessageCircle, Mic, Sparkles, Square, Users, X } from 'lucide-react';
import { useResidentSession } from '@/hooks/useResidentSession';
import { trackEvent } from '@/lib/analytics';
import * as dataService from '@/lib/dataService';
import { isLysDemoResidentId } from '@/lib/lysDemoResident';
import { postLysStaffMessage } from '@/lib/lysStaffMessage';
import { receiptText } from '@/lib/lys/iDag';
import { journalSavedWhere } from '@/lib/lys/simpleMode';
import { syncBadgesAfterJournal } from '@/lib/residentBadgeSync';
import type { LysThemeTokens } from '../lib/lysTheme';
import { useSpeech } from '../hooks/useSpeech';
import { useStaffReceipt } from '../hooks/useStaffReceipt';
import { DEMO_STAFF_MESSAGE_KEY, lysSun } from './lysUi';

export type FortaelTarget = 'mig' | 'personale' | 'lys';

/** Samme nøgle som kladden i Lys-chatten, så teksten står klar, når chatten åbner. */
const LYS_CHAT_DRAFT_KEY = 'budr_lys_chat_draft';

const STARTERS = [
  'Jeg har brug for hjælp til noget',
  'Jeg vil gerne tale med nogen',
  'Noget godt skete i dag',
  'Jeg er bekymret for noget',
] as const;

const TARGETS: {
  id: FortaelTarget;
  title: string;
  sub: string;
  Icon: typeof Lock;
  button: string;
}[] = [
  {
    id: 'mig',
    title: 'Kun mig',
    sub: 'Gemmes i din dagbog. Personalet kan ikke se det.',
    Icon: Lock,
    button: 'Gem i min dagbog',
  },
  {
    id: 'personale',
    title: 'Personalet',
    sub: 'De får besked, og du kan se, når de har læst det.',
    Icon: Users,
    button: 'Send til personalet',
  },
  {
    id: 'lys',
    title: 'Snak med Lys',
    sub: 'Lys svarer dig. Personalet kan læse samtalen.',
    Icon: Sparkles,
    button: 'Snak med Lys',
  },
];

type Props = {
  residentId: string;
  isDemoMode: boolean;
  tokens: LysThemeTokens;
  accent: string;
  /** Enkel Lys har ingen Min vej, så bekræftelsen skal pege på dagbogen på Nu. */
  simpleMode?: boolean;
  /** Forvalgt modtager, fx når borgeren trykker «Skriv til personalet» på Nu. */
  initialTarget?: FortaelTarget | null;
  /** Forudfyldt tekst, fx fra aftenkortet. */
  initialText?: string;
  onClose: () => void;
  onOpenAac: () => void;
};

/**
 * «Fortæl»: én knap til alt, borgeren vil sige. Tal eller skriv først, og vælg så selv,
 * hvem der må se det. Intet sendes, før borgeren har valgt.
 */
export default function LysFortael({
  residentId,
  isDemoMode,
  tokens,
  accent,
  simpleMode = false,
  initialTarget = null,
  initialText = '',
  onClose,
  onOpenAac,
}: Props) {
  const router = useRouter();
  const session = useResidentSession();
  const demo = isDemoMode || isLysDemoResidentId(residentId);
  const dark = tokens.colorScheme === 'dark';
  const sun = lysSun(dark);

  const [text, setText] = useState(initialText);
  const [target, setTarget] = useState<FortaelTarget | null>(initialTarget);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<FortaelTarget | null>(null);
  const [noMic, setNoMic] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);

  const { isListening, liveTranscript, startListening, stopListening, clearTranscript } =
    useSpeech();
  const baseRef = useRef('');
  const { status, setStatus } = useStaffReceipt(demo);

  useEffect(() => {
    if (!isListening && !liveTranscript) return;
    const base = baseRef.current.trim();
    setText(base ? `${base} ${liveTranscript}` : liveTranscript);
  }, [isListening, liveTranscript]);

  const toggleMic = () => {
    if (isListening) {
      stopListening();
      clearTranscript();
      return;
    }
    baseRef.current = text;
    if (startListening()) setUsedVoice(true);
    else setNoMic(true);
  };

  const send = async () => {
    const m = text.trim();
    if (!m || !target || sending) return;
    if (isListening) stopListening();
    setSending(true);
    setError(null);
    try {
      if (target === 'mig') {
        const activeId = session.activeId || residentId;
        const res = await dataService.saveJournalEntry(session.storageMode, activeId, {
          date: new Date().toISOString(),
          mode: usedVoice ? 'voice' : 'write',
          text: m,
          privacy: 'private',
        });
        void syncBadgesAfterJournal(
          session.storageMode,
          activeId,
          res.lysEntryCount ?? 1,
          m.length
        );
      } else if (target === 'personale') {
        // Demo: intet sendes, kvitteringen vises ud fra browseren.
        const res = demo ? { ok: true as const } : await postLysStaffMessage(m);
        if (!res.ok) {
          setError('Beskeden blev ikke sendt. Prøv igen, eller find en voksen.');
          return;
        }
        const sentAt = new Date().toISOString();
        if (demo) {
          try {
            localStorage.setItem(DEMO_STAFF_MESSAGE_KEY, JSON.stringify({ sentAt }));
          } catch {
            /* ignore */
          }
        }
        setStatus({ sentAt, seenAt: null, seenBy: null });
        const badgeId = session.activeId || residentId;
        void dataService
          .getBadges(session.storageMode, badgeId)
          .then((cur) =>
            cur.some((b) => b.badge_key === 'staff_bridge')
              ? undefined
              : dataService.earnBadge(session.storageMode, badgeId, 'staff_bridge')
          )
          .catch(() => undefined);
      } else {
        try {
          localStorage.setItem(LYS_CHAT_DRAFT_KEY, m);
        } catch {
          /* ignore */
        }
        trackEvent('lys_fortael_sent', { target });
        router.push('/lys-chat');
        return;
      }
      trackEvent('lys_fortael_sent', { target });
      setText('');
      clearTranscript();
      setDone(target);
    } catch {
      setError('Det blev ikke gemt. Prøv igen om lidt.');
    } finally {
      setSending(false);
    }
  };

  const receipt = status ? receiptText(status) : null;
  const chosen = TARGETS.find((t) => t.id === target);

  return (
    <div className="flex min-h-full flex-col" style={{ color: tokens.text }}>
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">Fortæl</h1>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` }}
          aria-label="Luk"
        >
          <X size={20} aria-hidden />
        </button>
      </div>

      {done ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pb-24 text-center">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: accent }}
            aria-hidden
          >
            <Check size={32} strokeWidth={2.5} />
          </span>
          <h2 className="text-[22px] font-bold">
            {done === 'mig' ? 'Gemt i din dagbog' : 'Sendt til personalet'}
          </h2>
          <p className="text-[16px]" style={{ color: tokens.textMuted }}>
            {done === 'mig'
              ? journalSavedWhere(simpleMode)
              : 'Du kan se her og på Nu, når de har læst det.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 min-h-[52px] w-full max-w-[280px] rounded-2xl text-[16px] font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Færdig
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-5 pb-10 pt-2">
          {receipt && (
            <p
              className="flex items-start gap-2 rounded-2xl px-4 py-3 text-[15px] font-medium"
              style={{
                backgroundColor: receipt.seen ? tokens.accentSoft : sun.soft,
                color: receipt.seen ? tokens.accentSoftText : tokens.text,
              }}
              role="status"
            >
              <MessageCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
              {receipt.text}
            </p>
          )}

          <section
            className="flex flex-col items-center gap-4 rounded-3xl border p-5"
            style={{ backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder }}
          >
            <button
              type="button"
              onClick={toggleMic}
              className="relative flex h-24 w-24 items-center justify-center rounded-full text-white transition-transform active:scale-95"
              style={{
                backgroundColor: isListening ? '#d9583f' : accent,
                boxShadow: isListening
                  ? '0 0 0 10px rgba(217,88,63,0.16)'
                  : `0 0 0 10px ${tokens.accentSoft}`,
              }}
              aria-label={isListening ? 'Stop optagelse' : 'Tal i stedet for at skrive'}
              aria-pressed={isListening}
            >
              {isListening ? <Square size={30} fill="#fff" aria-hidden /> : <Mic size={38} />}
            </button>
            <p className="text-[15px] font-medium" style={{ color: tokens.textMuted }}>
              {isListening
                ? 'Jeg lytter. Tryk igen, når du er færdig.'
                : noMic
                  ? 'Mikrofonen virker ikke her. Brug mikrofonen på tastaturet.'
                  : 'Tryk og tal, eller skriv herunder'}
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={2000}
              aria-label="Det, du vil fortælle"
              placeholder="Hvad vil du fortælle?"
              className="w-full resize-none rounded-2xl border px-4 py-3 text-[17px] leading-relaxed outline-none"
              style={{
                backgroundColor: tokens.bg,
                borderColor: tokens.cardBorder,
                color: tokens.text,
              }}
            />
            {!text.trim() && (
              <div className="flex w-full flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setText(s)}
                    className="min-h-[40px] rounded-full border px-3.5 text-[14px] font-medium"
                    style={{ borderColor: tokens.cardBorder, color: tokens.text }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={onOpenAac}
              className="flex min-h-[44px] items-center gap-2 text-[15px] font-semibold"
              style={{ color: tokens.accentSoftText }}
            >
              <Grid3x3 size={18} aria-hidden />
              Vis det hellere med billeder
            </button>
          </section>

          <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby="lys-fortael-hvem">
            <h2 id="lys-fortael-hvem" className="mb-1 text-[17px] font-semibold">
              Hvem må se det?
            </h2>
            {TARGETS.map(({ id, title, sub, Icon }) => {
              const on = target === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTarget(id)}
                  className="flex min-h-[68px] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors"
                  style={{
                    backgroundColor: on ? tokens.accentSoft : tokens.cardBg,
                    borderColor: on ? accent : tokens.cardBorder,
                  }}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: on ? accent : tokens.accentSoft,
                      color: on ? '#fff' : tokens.accentSoftText,
                    }}
                    aria-hidden
                  >
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold">{title}</span>
                    <span className="block text-[14px]" style={{ color: tokens.textMuted }}>
                      {sub}
                    </span>
                  </span>
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: on ? accent : tokens.cardBorder,
                      backgroundColor: on ? accent : 'transparent',
                    }}
                    aria-hidden
                  >
                    {on && <Check size={14} color="#fff" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!text.trim() || !target || sending}
            onClick={() => void send()}
            className="min-h-[56px] rounded-2xl text-[17px] font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            {sending ? 'Et øjeblik…' : (chosen?.button ?? 'Vælg, hvem der må se det')}
          </button>
          {error && (
            <p className="text-sm font-medium" style={{ color: '#c0392b' }} role="alert">
              {error}
            </p>
          )}
          <p className="text-sm" style={{ color: tokens.textMuted }}>
            Er det akut, så tryk Hjælp øverst på skærmen.
          </p>
        </div>
      )}
    </div>
  );
}

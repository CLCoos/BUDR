'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Grid3x3, MessageCircle, Sparkles } from 'lucide-react';
import { useResidentSession } from '@/hooks/useResidentSession';
import { trackEvent } from '@/lib/analytics';
import * as dataService from '@/lib/dataService';
import { isLysDemoResidentId } from '@/lib/lysDemoResident';
import { postLysStaffMessage } from '@/lib/lysStaffMessage';
import { receiptText, type StaffMessageStatus } from '@/lib/lys/iDag';
import { copenhagenOnCallShift } from '@/lib/onCallStaff';
import type { LysThemeTokens } from '../lib/lysTheme';
import LysJournalTab from './LysJournalTab';
import {
  DEMO_ON_CALL,
  DEMO_STAFF_MESSAGE_KEY,
  LysCard,
  LysLabel,
  LysLinkRow,
  lysSun,
  readDemoStaffMessage,
} from './lysUi';

type Props = {
  residentId: string;
  isDemoMode: boolean;
  tokens: LysThemeTokens;
  accent: string;
  onOpenAac: () => void;
};

type Section = 'personale' | 'dagbog';

const PRESETS = [
  'Jeg har brug for hjælp til noget',
  'Jeg vil gerne tale med nogen',
  'Jeg mangler noget praktisk',
] as const;

/** «Skriv»: til personalet (med kvittering) eller i egen dagbog. */
export default function LysSkriv({ residentId, isDemoMode, tokens, accent, onOpenAac }: Props) {
  const router = useRouter();
  const session = useResidentSession();
  const demo = isDemoMode || isLysDemoResidentId(residentId);
  const dark = tokens.colorScheme === 'dark';
  const sun = lysSun(dark);
  const [section, setSection] = useState<Section>('personale');

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<StaffMessageStatus | null>(null);

  const loadStatus = useCallback(() => {
    if (demo) {
      setStatus(
        readDemoStaffMessage(DEMO_ON_CALL[copenhagenOnCallShift(new Date())].split(' ')[0]!)
      );
      return;
    }
    void fetch('/api/lys/message-staff', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { latest: null }))
      .then((d: { latest?: StaffMessageStatus | null }) => setStatus(d.latest ?? null))
      .catch(() => undefined);
  }, [demo]);

  useEffect(() => {
    loadStatus();
    const t = window.setInterval(loadStatus, 30_000);
    return () => window.clearInterval(t);
  }, [loadStatus]);

  const send = async (message: string) => {
    const m = message.trim();
    if (!m || sending) return;
    setSending(true);
    setError(false);
    try {
      // Demo: intet sendes, kvitteringen vises ud fra browseren.
      const res = demo ? { ok: true as const } : await postLysStaffMessage(m);
      if (!res.ok) {
        setError(true);
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
      setText('');
      trackEvent('lys_staff_message_sent', { source: 'skriv' });
      const badgeId = session.activeId || residentId;
      void dataService
        .getBadges(session.storageMode, badgeId)
        .then((cur) =>
          cur.some((b) => b.badge_key === 'staff_bridge')
            ? undefined
            : dataService.earnBadge(session.storageMode, badgeId, 'staff_bridge')
        )
        .catch(() => undefined);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  const receipt = status ? receiptText(status) : null;

  return (
    <div className="flex flex-col gap-4 px-5 pb-6 pt-5" style={{ color: tokens.text }}>
      <header>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">Skriv</h1>
        <p className="mt-0.5 text-[15px]" style={{ color: tokens.textMuted }}>
          Til personalet, eller kun til dig selv.
        </p>
      </header>

      <div
        className="grid grid-cols-2 gap-1 rounded-2xl p-1"
        style={{ backgroundColor: tokens.accentSoft }}
        role="tablist"
        aria-label="Hvem skriver du til"
      >
        {(
          [
            ['personale', 'Til personalet'],
            ['dagbog', 'Min dagbog'],
          ] as const
        ).map(([id, label]) => {
          const on = section === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setSection(id)}
              className="min-h-[44px] rounded-xl text-[15px] font-semibold transition-colors"
              style={{
                backgroundColor: on ? tokens.cardBg : 'transparent',
                color: on ? tokens.text : tokens.accentSoftText,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {section === 'personale' ? (
        <>
          {receipt && (
            <p
              className="flex items-start gap-2 rounded-2xl px-4 py-3 text-[15px] font-medium"
              style={{
                backgroundColor: receipt.seen ? tokens.accentSoft : sun.soft,
                color: receipt.seen ? tokens.accentSoftText : tokens.text,
                border: receipt.seen ? 'none' : `1px solid ${sun.border}`,
              }}
              role="status"
            >
              <MessageCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
              {receipt.text}
            </p>
          )}

          <LysCard tokens={tokens} labelledBy="lys-skriv-hurtigt">
            <LysLabel tokens={tokens} id="lys-skriv-hurtigt">
              Tryk for at sende
            </LysLabel>
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={sending}
                onClick={() => void send(p)}
                className="min-h-[52px] rounded-2xl border px-4 text-left text-[16px] font-medium transition-opacity active:opacity-70 disabled:opacity-50"
                style={{ borderColor: tokens.cardBorder, color: tokens.text }}
              >
                {p}
              </button>
            ))}
          </LysCard>

          <LysCard tokens={tokens} labelledBy="lys-skriv-selv">
            <LysLabel tokens={tokens} id="lys-skriv-selv">
              Eller skriv selv
            </LysLabel>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={200}
              aria-labelledby="lys-skriv-selv"
              placeholder="Skriv her, eller brug mikrofonen på tastaturet"
              className="w-full resize-none rounded-2xl border px-4 py-3 text-[16px] outline-none"
              style={{
                backgroundColor: tokens.bg,
                borderColor: tokens.cardBorder,
                color: tokens.text,
              }}
            />
            <button
              type="button"
              disabled={!text.trim() || sending}
              onClick={() => void send(text)}
              className="min-h-[52px] rounded-2xl text-[16px] font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {sending ? 'Sender…' : 'Send til personalet'}
            </button>
            {error && (
              <p className="text-sm font-medium" style={{ color: '#c0392b' }} role="alert">
                Beskeden blev ikke sendt. Prøv igen, eller find en voksen.
              </p>
            )}
            <p className="text-sm" style={{ color: tokens.textMuted }}>
              Kun personalet på dit bosted kan se det. Er det akut, så tryk Hjælp øverst.
            </p>
          </LysCard>

          <LysCard tokens={tokens}>
            <LysLinkRow
              tokens={tokens}
              icon={<Grid3x3 size={18} />}
              title="Kommunikationstavle"
              sub="Vis med billeder, hvad du har brug for"
              onClick={onOpenAac}
            />
            <LysLinkRow
              tokens={tokens}
              icon={<Sparkles size={18} />}
              title="Tal med Lys"
              sub="Snak om det, der fylder"
              onClick={() => router.push('/lys-chat')}
            />
          </LysCard>
        </>
      ) : (
        <div className="-mx-5 -mt-2">
          <LysJournalTab tokens={tokens} accent={accent} />
        </div>
      )}
    </div>
  );
}

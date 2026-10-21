'use client';

import React from 'react';
import { LifeBuoy, MessageCircle, Phone, Users, Wind, X } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';
import { LysCard, LysLabel, LysLinkRow, lysSun } from './lysUi';

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  onClose: () => void;
  onCrisis: () => void;
  onCalm: () => void;
  onWhoIsHere: () => void;
  onWriteStaff: () => void;
};

const NUMBERS = [
  { name: 'Alarm 112', number: '112', sub: 'Hvis nogen er i fare lige nu' },
  {
    name: 'Livslinien',
    number: '70 201 201',
    sub: 'Hvis du tænker på selvmord. Anonymt, hele døgnet.',
  },
] as const;

/** «Hjælp»: ét sted til alt, der hjælper, når det er svært. */
export default function LysHjaelp({
  tokens,
  accent,
  onClose,
  onCrisis,
  onCalm,
  onWhoIsHere,
  onWriteStaff,
}: Props) {
  const sun = lysSun(tokens.colorScheme === 'dark');

  return (
    <div className="flex flex-col gap-4 px-5 pb-10 pt-5" style={{ color: tokens.text }}>
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">Hjælp</h1>
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

      <button
        type="button"
        onClick={onCrisis}
        className="flex min-h-[96px] items-center gap-4 rounded-3xl px-5 py-4 text-left transition-transform active:scale-[0.98]"
        style={{ backgroundColor: sun.soft, border: `2px solid ${sun.border}` }}
      >
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white"
          style={{ backgroundColor: '#d9583f' }}
          aria-hidden
        >
          <LifeBuoy size={28} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[19px] font-bold">Jeg har brug for hjælp nu</span>
          <span className="block text-[15px]" style={{ color: tokens.textMuted }}>
            Din kriseplan, vejrtrækning og personalet
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={onCalm}
        className="flex min-h-[84px] items-center gap-4 rounded-3xl border px-5 py-4 text-left transition-transform active:scale-[0.98]"
        style={{ backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder }}
      >
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white"
          style={{ backgroundColor: accent }}
          aria-hidden
        >
          <Wind size={28} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[19px] font-bold">Find ro</span>
          <span className="block text-[15px]" style={{ color: tokens.textMuted }}>
            Øvelser for kroppen og sanserne
          </span>
        </span>
      </button>

      <LysCard tokens={tokens}>
        <LysLinkRow
          tokens={tokens}
          icon={<Users size={18} />}
          title="Hvem er på arbejde"
          sub="Se hvem du kan ringe til"
          onClick={onWhoIsHere}
        />
        <LysLinkRow
          tokens={tokens}
          icon={<MessageCircle size={18} />}
          title="Skriv til personalet"
          sub="Du kan se, når de har læst det"
          onClick={onWriteStaff}
        />
      </LysCard>

      <LysCard tokens={tokens} labelledBy="lys-hjaelp-numre">
        <LysLabel tokens={tokens} id="lys-hjaelp-numre">
          Ring selv
        </LysLabel>
        {NUMBERS.map((n) => (
          <a
            key={n.number}
            href={`tel:${n.number.replace(/\s/g, '')}`}
            className="flex min-h-[60px] items-center gap-3 rounded-2xl px-1 py-2"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: tokens.accentSoft, color: tokens.accentSoftText }}
              aria-hidden
            >
              <Phone size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold">{n.name}</span>
              <span className="block text-sm" style={{ color: tokens.textMuted }}>
                {n.sub}
              </span>
            </span>
            <span className="text-[16px] font-bold tabular-nums" style={{ color: tokens.text }}>
              {n.number}
            </span>
          </a>
        ))}
      </LysCard>
    </div>
  );
}

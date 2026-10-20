'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '@/components/documents/shared';
import type { SignalTone, TilsynSignal } from '@/lib/tilsyn';

type Tilsyn = {
  today: string;
  headline: { tone: SignalTone; text: string };
  signals: TilsynSignal[];
};

const TONE: Record<SignalTone, { fg: string; bg: string; label: string }> = {
  ok: { fg: 'var(--cp-green)', bg: 'var(--cp-green-dim)', label: 'I orden' },
  obs: { fg: 'var(--cp-amber)', bg: 'var(--cp-amber-dim)', label: 'Bør ses på' },
  kritisk: { fg: 'var(--cp-red)', bg: 'var(--cp-red-dim)', label: 'Skal ordnes' },
};

const ORDER: Record<SignalTone, number> = { kritisk: 0, obs: 1, ok: 2 };

function SignalCard({ s }: { s: TilsynSignal }) {
  const tone = TONE[s.tone];
  return (
    <li
      className="flex flex-col rounded-2xl border p-4"
      style={{ backgroundColor: 'var(--cp-card-bg)', borderColor: 'var(--cp-border)' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: tone.fg }}
          aria-hidden
        />
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--cp-text)' }}>
          {s.title}
        </h3>
        <span
          className="ml-auto rounded-md px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: tone.bg, color: tone.fg }}
        >
          {tone.label}
        </span>
      </div>
      <p className="mt-2 text-sm leading-snug" style={{ color: 'var(--cp-text)' }}>
        {s.summary}
      </p>
      {s.items.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {s.items.slice(0, 4).map((it, i) => (
            <li key={i} className="flex items-baseline gap-2">
              {it.href ? (
                <Link
                  href={it.href}
                  className="min-w-0 truncate hover:underline"
                  style={{ color: 'var(--cp-text)' }}
                >
                  {it.label}
                </Link>
              ) : (
                <span className="min-w-0 truncate" style={{ color: 'var(--cp-text)' }}>
                  {it.label}
                </span>
              )}
              {it.detail && (
                <span className="ml-auto shrink-0 text-xs" style={{ color: 'var(--cp-muted)' }}>
                  {it.detail}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {s.href && s.tone !== 'ok' && (
        <Link
          href={s.href}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
          style={{ color: 'var(--cp-green)' }}
        >
          {s.key === 'fagsystem' ? 'Åbn Til fagsystem' : 'Gå til journalen'}
          <ArrowRight size={14} aria-hidden />
        </Link>
      )}
    </li>
  );
}

/**
 * Lederens tilsynsoverblik: «Er I klar, hvis tilsynet kommer i morgen?». Bygger kun på data,
 * portalen har; hvert punkt linker til der, hvor det ordnes.
 */
export default function TilsynPanel() {
  const [data, setData] = useState<Tilsyn | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    void api<Tilsyn>('/api/portal/tilsyn')
      .then(setData)
      .catch(() => setHidden(true));
  }, []);

  if (hidden || !data) return null;

  const head = TONE[data.headline.tone];
  const signals = [...data.signals].sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);

  return (
    <section className="mb-8" aria-labelledby="tilsyn-title">
      <div
        className="mb-4 flex items-start gap-3 rounded-2xl p-5"
        style={{ backgroundColor: 'var(--cp-ink)', color: '#fff' }}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'var(--cp-ink-2)', color: 'var(--cp-ink-accent)' }}
        >
          <ShieldCheck size={22} aria-hidden />
        </span>
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--cp-ink-accent)' }}
          >
            Til lederen
          </p>
          <h2 id="tilsyn-title" className="mt-0.5 text-lg font-semibold leading-snug">
            Er I klar, hvis tilsynet kommer i morgen?
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: head.fg }}
              aria-hidden
            />
            {data.headline.text}
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {signals.map((s) => (
          <SignalCard key={s.key} s={s} />
        ))}
      </ul>
    </section>
  );
}

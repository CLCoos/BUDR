'use client';

import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

/**
 * Fælles ramme for rapporterne (overrapport, tilsynsrapport, indsatsdokumentation).
 * Computer: glider ind fra højre, så vagten stadig kan se forsiden bag ved.
 * Mobil: fylder hele skærmen med knapperne fast i bunden.
 */
type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Lille linje over titlen, fx «Fredag 23. oktober · kl. 15.10 · Bosted Solhaven». */
  meta?: string;
  /** Kortere udgave til mobil, fx «Kl. 15.10». */
  metaMobile?: string;
  /** Én linje under titlen, fx «6 borgere · 3 kræver opmærksomhed». */
  summary?: React.ReactNode;
  /** Tekst på tilbage-knappen på mobil. */
  backLabel?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export default function ReportSheet({
  open,
  onClose,
  title,
  meta,
  metaMobile,
  summary,
  backLabel = 'Tilbage',
  footer,
  children,
}: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10068]" style={{ fontFamily: 'var(--cp-font)' }}>
      <div
        className="absolute inset-0 hidden sm:block"
        style={{ backgroundColor: 'rgba(11, 27, 43, 0.28)' }}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-0 flex flex-col sm:left-auto sm:w-[600px] sm:max-w-full"
        style={{
          backgroundColor: 'var(--cp-card-bg)',
          color: 'var(--cp-text)',
          boxShadow: '-12px 0 40px rgba(11, 27, 43, 0.16)',
        }}
      >
        <header
          className="flex shrink-0 flex-col gap-1 border-b px-4 pb-4 pt-2 sm:gap-1.5 sm:px-8 sm:pb-5 sm:pt-6"
          style={{ borderColor: 'var(--cp-border)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="-ml-1 inline-flex min-h-[44px] items-center px-1 text-[15px] sm:hidden"
              style={{ color: 'var(--cp-green)' }}
            >
              ‹ {backLabel}
            </button>
            {meta ? (
              <p
                className="m-0 min-w-0 truncate text-[13px] sm:text-sm"
                style={{ color: 'var(--cp-muted)' }}
              >
                <span className="sm:hidden">{metaMobile ?? meta}</span>
                <span className="hidden sm:inline">{meta}</span>
              </p>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Luk"
              className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition-colors hover:bg-[var(--cp-bg3)] sm:flex"
            >
              <X size={20} style={{ color: 'var(--cp-muted)' }} aria-hidden />
            </button>
          </div>
          <h2
            id={titleId}
            className="m-0 text-[26px] font-semibold tracking-[-0.01em] sm:text-[28px]"
            style={{ color: 'var(--cp-text)' }}
          >
            {title}
          </h2>
          {summary ? (
            <p
              className="m-0 text-[15px] sm:mt-1 sm:text-base"
              style={{ color: 'var(--cp-muted)' }}
            >
              {summary}
            </p>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-8">{children}</div>

        {footer ? (
          <footer
            className="shrink-0 border-t px-4 pb-5 pt-3 sm:px-8 sm:py-5"
            style={{
              borderColor: 'var(--cp-border)',
              backgroundColor: 'var(--cp-card-bg)',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            }}
          >
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

/** Mono-overskrift mellem dele af en rapport, i stedet for en ny boks. */
export function ReportSectionLabel({
  children,
  first = false,
}: {
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <h3
      className={`m-0 ${first ? 'mt-5' : 'mt-7'} mb-1 text-[12px] font-medium uppercase tracking-[0.04em] sm:text-[13px]`}
      style={{ color: 'var(--cp-muted)', fontFamily: 'var(--cp-font-mono)' }}
    >
      {children}
    </h3>
  );
}

/** Knapperne i bunden: én grøn hovedhandling, én stille, og evt. en tekstknap. */
export function ReportActions({
  primary,
  secondary,
  tertiary,
}: {
  primary: { label: string; onClick: () => void; icon?: React.ReactNode; disabled?: boolean };
  secondary?: { label: string; onClick: () => void; disabled?: boolean };
  tertiary?: { label: string; onClick: () => void; disabled?: boolean }[];
}) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2.5 sm:flex sm:items-center sm:gap-3">
      <button
        type="button"
        onClick={primary.onClick}
        disabled={primary.disabled}
        className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold disabled:opacity-50 sm:h-12"
        style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green, #fff)' }}
      >
        {primary.icon}
        {primary.label}
      </button>
      {secondary ? (
        <button
          type="button"
          onClick={secondary.onClick}
          disabled={secondary.disabled}
          className="inline-flex h-[52px] items-center justify-center rounded-xl border px-4 text-base font-medium disabled:opacity-50 sm:h-12"
          style={{
            borderColor: 'var(--cp-border2)',
            backgroundColor: 'var(--cp-card-bg)',
            color: 'var(--cp-text)',
          }}
        >
          {secondary.label}
        </button>
      ) : null}
      {tertiary?.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={t.onClick}
          disabled={t.disabled}
          className="hidden h-12 items-center px-3 text-[15px] disabled:opacity-50 sm:inline-flex"
          style={{ color: 'var(--cp-muted)' }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

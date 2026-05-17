'use client';

import React, { useCallback, useId, useState } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';

type Props = {
  title: string;
  children: React.ReactNode;
  /** Unik nøgle til localStorage (kollapset tilstand) */
  storageKey: string;
  className?: string;
};

export default function DemoWhyBox({ title, children, storageKey, className = '' }: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.localStorage.getItem(storageKey) !== '0';
    } catch {
      return true;
    }
  });

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [storageKey]);

  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{
        borderColor: 'rgba(139, 132, 232, 0.35)',
        backgroundColor: 'rgba(139, 132, 232, 0.08)',
      }}
    >
      <button
        type="button"
        id={`${panelId}-btn`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors"
        style={{ color: 'var(--cp-text)' }}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Lightbulb className="h-4 w-4 shrink-0 text-[#c4bffc]" aria-hidden />
          <span className="text-sm font-semibold leading-snug">{title}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--cp-muted)' }}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={`${panelId}-btn`}
          className="border-t px-4 pb-4 pt-0 text-sm leading-relaxed"
          style={{ borderColor: 'rgba(139, 132, 232, 0.25)', color: 'var(--cp-muted)' }}
        >
          <div className="pt-3">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

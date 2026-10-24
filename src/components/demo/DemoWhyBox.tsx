'use client';

import React, { useCallback, useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type Props = {
  title: string;
  children: React.ReactNode;
  /** Unik nøgle til localStorage (husker om linjen er foldet ud). */
  storageKey: string;
  className?: string;
  /** Farve på linket (standard: Care Portal --cp-green). */
  headingColor?: string;
};

/**
 * «Hvorfor …?» som én stille linje, der folder sig ud ved tryk.
 * Starter lukket, så forklaringerne ikke fylder midt i arbejdet.
 */
export default function DemoWhyBox({
  title,
  children,
  storageKey,
  className = '',
  headingColor,
}: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) === '1') setOpen(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

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
    <div className={className}>
      <button
        type="button"
        id={`${panelId}-btn`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="inline-flex min-h-[44px] items-center gap-1 text-left text-[15px] hover:underline"
        style={{ color: headingColor ?? 'var(--cp-green)' }}
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={`${panelId}-btn`}
          className="mt-1 max-w-[68ch] text-[15px] leading-relaxed"
          style={{ color: 'var(--cp-muted)' }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

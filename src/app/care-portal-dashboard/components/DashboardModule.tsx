'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type Props = {
  id: string;
  title: string;
  subtitle?: string;
  /** Åben ved første visning (fx medicin + journal). */
  defaultOpen?: boolean;
  children: React.ReactNode;
  /** Ekstra klasser på indhold (fx `space-y-5` ved flere kort). */
  contentClassName?: string;
  /** Intern scroll når indholdet er højt. */
  maxBodyHeightClassName?: string;
};

export default function DashboardModule({
  id,
  title,
  subtitle,
  defaultOpen = false,
  children,
  contentClassName = 'p-4 pt-3 space-y-4',
  maxBodyHeightClassName = 'max-h-[70vh]',
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
    >
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.03)]"
      >
        <div className="min-w-0">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            {title}
          </h2>
          {subtitle ? (
            <p className="text-xs mt-0.5" style={{ color: 'var(--cp-muted)' }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--cp-muted2)' }}
          aria-hidden
        />
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-trigger`}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`border-t overflow-y-auto ${maxBodyHeightClassName} ${contentClassName}`}
            style={{ borderColor: 'var(--cp-border)' }}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

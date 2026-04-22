'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

export type DepartmentOption = { id: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  departments: readonly DepartmentOption[];
  /** Første række (typisk "alle") */
  allLabel?: string;
  /** Værdi der betyder "alle" (default `alle`) */
  allValue?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
};

export default function DepartmentSelect({
  value,
  onChange,
  departments,
  allLabel = 'Alle afdelinger',
  allValue = 'alle',
  className = '',
  id,
  'aria-label': ariaLabel = 'Vælg afdeling',
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isAll = value === allValue || value === '';

  const sorted = [...departments].sort((a, b) => a.label.localeCompare(b.label, 'da'));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const displayLabel = isAll
    ? allLabel
    : (sorted.find((d) => d.id === value)?.label ??
      departments.find((d) => d.id === value)?.label ??
      allLabel);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex w-full min-w-[10.5rem] max-w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:opacity-[0.92]"
        style={{
          border: '1px solid var(--cp-border)',
          backgroundColor: 'var(--cp-bg3)',
          color: 'var(--cp-text)',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="min-w-0 flex-1 truncate">{displayLabel}</span>
        <span className="shrink-0 text-[10px] opacity-70" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-[80] mt-1 max-h-60 min-w-full overflow-auto rounded-lg border py-1 shadow-xl"
          style={{
            borderColor: 'var(--cp-border)',
            backgroundColor: 'var(--cp-bg2)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          }}
        >
          <li
            role="option"
            aria-selected={isAll}
            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors"
            style={{
              borderBottom: '1px solid var(--cp-border)',
              backgroundColor: isAll ? 'var(--cp-bg3)' : undefined,
              color: 'var(--cp-text)',
            }}
            onClick={() => {
              onChange(allValue);
              setOpen(false);
            }}
          >
            <span className="flex w-4 shrink-0 justify-center" aria-hidden>
              {isAll ? (
                <Check className="h-3.5 w-3.5" style={{ color: 'var(--cp-green)' }} />
              ) : null}
            </span>
            <span className="truncate">{allLabel}</span>
          </li>
          {sorted.map((d) => {
            const selected = value === d.id;
            return (
              <li
                key={d.id}
                role="option"
                aria-selected={selected}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors"
                style={{
                  backgroundColor: selected ? 'var(--cp-bg3)' : undefined,
                  color: 'var(--cp-text)',
                }}
                onClick={() => {
                  onChange(d.id);
                  setOpen(false);
                }}
              >
                <span className="flex w-4 shrink-0 justify-center" aria-hidden>
                  {selected ? (
                    <Check className="h-3.5 w-3.5" style={{ color: 'var(--cp-green)' }} />
                  ) : null}
                </span>
                <span className="truncate">{d.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

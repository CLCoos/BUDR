'use client';

import React from 'react';
import { FileEdit, Sparkles } from 'lucide-react';

type Props = {
  value: 'original' | 'ai';
  onChange: (next: 'original' | 'ai') => void;
  /** Care Portal mørk skal (360°); ellers lys dashboard */
  variant: 'portal-dark' | 'light';
};

/**
 * Kompakt segment-kontrol (inspireret af tema-knap): skift mellem originalt udkast og AI-forslag.
 */
export function JournalVersionToggle({ value, onChange, variant }: Props) {
  const isDark = variant === 'portal-dark';

  const trackStyle: React.CSSProperties = isDark
    ? { backgroundColor: 'var(--cp-bg3)' }
    : { backgroundColor: 'rgb(243 244 246)' };

  const segment = (key: 'original' | 'ai', label: string, Icon: typeof FileEdit) => {
    const on = value === key;
    return (
      <button
        type="button"
        key={key}
        onClick={() => onChange(key)}
        aria-pressed={on}
        className={`inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold tracking-wide transition-all sm:flex-none sm:px-3 ${
          on
            ? isDark
              ? 'text-[var(--cp-text)] shadow-sm'
              : 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
            : isDark
              ? 'text-[var(--cp-muted)] hover:bg-white/[0.04] hover:text-[var(--cp-text)]'
              : 'text-gray-500 hover:bg-gray-200/60 hover:text-gray-800'
        }`}
        style={
          on && isDark
            ? { backgroundColor: 'var(--cp-bg2)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }
            : undefined
        }
      >
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden strokeWidth={2} />
        {label}
      </button>
    );
  };

  return (
    <div
      className="inline-flex w-full max-w-[220px] rounded-lg p-0.5 sm:w-auto sm:max-w-none"
      style={trackStyle}
      role="group"
      aria-label="Vælg version af notatet"
    >
      {segment('original', 'Original', FileEdit)}
      {segment('ai', 'AI-forslag', Sparkles)}
    </div>
  );
}

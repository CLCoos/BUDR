'use client';

import React from 'react';
import type { VagtMoment } from '@/lib/vagt';

/** Mød ind / Nu / Gå hjem. Samme stille faner i demoen og i den rigtige portal. */
const ITEMS: { id: VagtMoment; label: string }[] = [
  { id: 'moed', label: 'Mød ind' },
  { id: 'nu', label: 'Nu' },
  { id: 'hjem', label: 'Gå hjem' },
];

export default function MomentTabs({
  moment,
  onChange,
}: {
  moment: VagtMoment;
  onChange: (m: VagtMoment) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Vagtens dele"
      className="grid grid-cols-3 gap-1 rounded-xl p-1 sm:inline-grid sm:w-fit"
      style={{ backgroundColor: 'var(--cp-tab-track, #e8ecf0)' }}
    >
      {ITEMS.map((it) => {
        const on = it.id === moment;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.id)}
            className="h-10 rounded-[9px] px-5 text-[15px] transition-colors"
            style={
              on
                ? {
                    backgroundColor: 'var(--cp-card-bg)',
                    color: 'var(--cp-text)',
                    fontWeight: 600,
                    boxShadow: '0 1px 3px rgba(11, 27, 43, 0.12)',
                  }
                : { backgroundColor: 'transparent', color: 'var(--cp-muted)' }
            }
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

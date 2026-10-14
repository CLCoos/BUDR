'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mic } from 'lucide-react';

type Props<T extends string> = {
  tabs: readonly T[];
  labels: Record<T, string>;
  defaultTab: T;
  pendingProposals: number;
  /** Server-renderet indhold pr. fane. Kun fanen der vises (og tidligere viste) bliver monteret. */
  panels: Record<T, React.ReactNode>;
};

/**
 * Faner der skifter øjeblikkeligt i browseren: alt server-data er hentet ved første visning,
 * så et klik ændrer kun URL'en (`?tab=`) via History API — ingen ny serveranmodning.
 * Besøgte faner holdes monteret (skjult), så man kan hoppe frem og tilbage uden genindlæsning.
 */
export default function ResidentTabs<T extends string>({
  tabs,
  labels,
  defaultTab,
  pendingProposals,
  panels,
}: Props<T>) {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get('tab');
  const active: T =
    fromUrl && (tabs as readonly string[]).includes(fromUrl) ? (fromUrl as T) : defaultTab;

  const [visited, setVisited] = useState<Set<T>>(() => new Set([active]));
  useEffect(() => {
    setVisited((prev) => (prev.has(active) ? prev : new Set(prev).add(active)));
  }, [active]);

  const select = (t: T) => {
    if (t === active) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', t);
    params.delete('writeJournal');
    // Next.js synkroniserer useSearchParams med pushState — ingen server-runde.
    window.history.pushState(null, '', `?${params.toString()}`);
  };

  return (
    <>
      <div
        role="tablist"
        className="mb-6 mt-4 flex gap-1 overflow-x-auto rounded-xl border p-1"
        style={{
          borderColor: 'var(--cp-border)',
          backgroundColor: 'var(--cp-bg3)',
        }}
      >
        {tabs.map((t) => {
          const on = active === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => select(t)}
              className="whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all sm:px-4"
              style={
                on
                  ? {
                      backgroundColor: 'var(--cp-green-dim)',
                      color: 'var(--cp-green)',
                      boxShadow: '0 0 0 1px rgba(45,212,160,0.2)',
                    }
                  : { color: 'var(--cp-muted)' }
              }
            >
              {labels[t]}
              {t === 'lys-samtaler' && <Mic size={13} className="ml-1 inline" aria-hidden />}
              {t === 'dagsplan' && pendingProposals > 0 && (
                <span
                  className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                  style={{ backgroundColor: 'var(--cp-amber)' }}
                >
                  {pendingProposals}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((t) =>
        visited.has(t) || t === active ? (
          <div key={t} role="tabpanel" hidden={t !== active}>
            {panels[t]}
          </div>
        ) : null
      )}
    </>
  );
}

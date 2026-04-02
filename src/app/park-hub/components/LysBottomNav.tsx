'use client';

import React from 'react';
import { BookOpen, Flower2, Home, Zap } from 'lucide-react';

export type LysNavTab = 'hjem' | 'dag' | 'journal' | 'mig';

type Props = {
  active: LysNavTab;
  onChange: (tab: LysNavTab) => void;
  showDagReminderDot: boolean;
  hidden?: boolean;
};

const TABS: { id: LysNavTab; label: string; Icon: typeof Home }[] = [
  { id: 'hjem',    label: 'Hjem',    Icon: Home },
  { id: 'dag',     label: 'Dag',     Icon: Zap },
  { id: 'journal', label: 'Journal', Icon: BookOpen },
  { id: 'mig',     label: 'Mig',     Icon: Flower2 },
];

export default function LysBottomNav({
  active,
  onChange,
  showDagReminderDot,
  hidden,
}: Props) {
  if (hidden) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl"
      style={{
        backgroundColor: 'rgba(19,25,32,0.92)',
        borderTop: '1px solid var(--lys-border)',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
      aria-label="Hovedmenu"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-2">
        {TABS.map(tab => {
          const isOn = active === tab.id;
          const Icon = tab.Icon;
          const showDot = tab.id === 'dag' && showDagReminderDot;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 transition-all duration-200"
              style={{ color: isOn ? 'var(--lys-green)' : 'var(--lys-muted)' }}
              aria-current={isOn ? 'page' : undefined}
            >
              <span className="relative z-10 inline-flex">
                <Icon
                  className="h-[22px] w-[22px] transition-all duration-200"
                  strokeWidth={isOn ? 2.5 : 1.75}
                  aria-hidden
                />
                {showDot && (
                  <span
                    className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: 'var(--lys-amber)',
                      boxShadow: '0 0 0 2px rgba(19,25,32,0.92), 0 0 6px var(--lys-amber)',
                    }}
                    aria-hidden
                  />
                )}
              </span>

              <span
                className="relative z-10 text-[11px] font-semibold leading-none tracking-wide"
                style={{ color: isOn ? 'var(--lys-green)' : 'var(--lys-muted)' }}
              >
                {tab.label}
              </span>

              {/* Active dot indicator */}
              {isOn && (
                <span
                  className="absolute bottom-1 h-1 w-1 rounded-full"
                  style={{ backgroundColor: 'var(--lys-green)' }}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

'use client';

import React from 'react';
import { BookOpen, Flower2, Home, Zap } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';

export type LysNavTab = 'hjem' | 'dag' | 'journal' | 'mig';

type Props = {
  active: LysNavTab;
  onChange: (tab: LysNavTab) => void;
  tokens: LysThemeTokens;
  accent: string;
  showDagReminderDot: boolean;
  hidden?: boolean;
  lightBar?: boolean;
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
  tokens,
  accent,
  showDagReminderDot,
  hidden,
  lightBar,
}: Props) {
  if (hidden) return null;

  const inactiveColor = lightBar
    ? 'rgba(15, 23, 42, 0.38)'
    : 'rgba(255, 255, 255, 0.35)';

  const navBg = lightBar
    ? 'rgba(253, 250, 245, 0.90)'
    : 'rgba(8, 14, 28, 0.88)';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl"
      style={{
        backgroundColor: navBg,
        borderTop: `1px solid ${accent}14`,
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
              style={{ color: isOn ? accent : inactiveColor }}
              aria-current={isOn ? 'page' : undefined}
            >
              {/* Pill capsule — active state indicator */}
              {isOn && (
                <span
                  className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-2xl transition-all duration-300"
                  style={{ backgroundColor: `${accent}1A` }}
                  aria-hidden
                />
              )}

              <span className="relative z-10 inline-flex">
                <Icon
                  className="h-[22px] w-[22px] transition-all duration-200"
                  strokeWidth={isOn ? 2.5 : 1.75}
                  aria-hidden
                />
                {showDot && (
                  <span
                    className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-amber-400"
                    style={{ boxShadow: `0 0 0 2px ${navBg}` }}
                    aria-hidden
                  />
                )}
              </span>

              <span className="relative z-10 text-[11px] font-semibold leading-none tracking-wide">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

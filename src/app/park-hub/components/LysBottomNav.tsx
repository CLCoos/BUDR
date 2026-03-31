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
  /** Light theme nav bar → inactive labels use dark muted color */
  lightBar?: boolean;
};

const TABS: { id: LysNavTab; label: string; Icon: typeof Home }[] = [
  { id: 'hjem', label: 'Hjem', Icon: Home },
  { id: 'dag', label: 'Dag', Icon: Zap },
  { id: 'journal', label: 'Journal', Icon: BookOpen },
  { id: 'mig', label: 'Mig', Icon: Flower2 },
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

  const inactiveColor = lightBar ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.4)';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 backdrop-blur-md transition-all duration-200"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.22) 0%, color-mix(in srgb, ${tokens.bg} 75%, black) 100%)`,
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
      aria-label="Hovedmenu"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-1">
        {TABS.map(tab => {
          const isOn = active === tab.id;
          const Icon = tab.Icon;
          const showDot = tab.id === 'dag' && showDagReminderDot;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className="relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-1 transition-all duration-200"
              style={{
                color: isOn ? accent : inactiveColor,
              }}
              aria-current={isOn ? 'page' : undefined}
            >
              {isOn ? (
                <span
                  className="absolute top-1.5 h-1.5 w-1.5 rounded-full transition-all duration-200"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
              ) : null}
              <span className="relative mt-1 inline-flex">
                <Icon className="h-6 w-6" strokeWidth={isOn ? 2.25 : 1.75} aria-hidden />
                {showDot ? (
                  <span
                    className="absolute -right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400"
                    aria-hidden
                  />
                ) : null}
              </span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

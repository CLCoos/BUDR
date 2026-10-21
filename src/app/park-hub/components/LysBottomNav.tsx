'use client';

import React from 'react';
import { CalendarDays, LifeBuoy, PenLine, Sun, UserRound } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';
import { lysParkHubShell } from '../lib/lysTheme';

export type LysNavTab = 'hjem' | 'dag' | 'skriv' | 'mig';

type Props = {
  tokens?: LysThemeTokens;
  active: LysNavTab;
  onChange: (tab: LysNavTab) => void;
  onCrisis?: () => void;
  showDagReminderDot: boolean;
  hidden?: boolean;
  simpleMode?: boolean;
};

/** Fire faste faner. Enkel tilstand: tre store knapper med Hjælp i midten af hånden. */
export default function LysBottomNav({
  tokens = lysParkHubShell(),
  active,
  onChange,
  onCrisis,
  showDagReminderDot,
  hidden,
  simpleMode = false,
}: Props) {
  if (hidden) return null;

  const tabs = simpleMode
    ? [
        { id: 'hjem', label: 'I dag', Icon: Sun, onPress: () => onChange('hjem') },
        { id: 'skriv', label: 'Skriv', Icon: PenLine, onPress: () => onChange('skriv') },
        { id: 'krise', label: 'Hjælp', Icon: LifeBuoy, onPress: () => onCrisis?.() },
      ]
    : [
        { id: 'hjem', label: 'I dag', Icon: Sun, onPress: () => onChange('hjem') },
        { id: 'dag', label: 'Min dag', Icon: CalendarDays, onPress: () => onChange('dag') },
        { id: 'skriv', label: 'Skriv', Icon: PenLine, onPress: () => onChange('skriv') },
        { id: 'mig', label: 'Mig', Icon: UserRound, onPress: () => onChange('mig') },
      ];

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 backdrop-blur-2xl"
      style={{
        backgroundColor: tokens.bottomNavBg,
        borderTop: `1px solid ${tokens.cardBorder}`,
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
      aria-label="Hovedmenu"
    >
      <div
        className={`grid min-h-[64px] w-full items-stretch px-2 ${simpleMode ? 'grid-cols-3' : 'grid-cols-4'}`}
      >
        {tabs.map((tab) => {
          const isOn = active === (tab.id as LysNavTab);
          const Icon = tab.Icon;
          const showDot = tab.id === 'dag' && showDagReminderDot;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onPress}
              className="relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200"
              style={{
                backgroundColor: isOn ? tokens.accentSoft : 'transparent',
                color: isOn ? tokens.accent : tokens.textMuted,
              }}
              aria-current={isOn ? 'page' : undefined}
            >
              <span className="relative z-10 inline-flex">
                <Icon
                  className="h-[22px] w-[22px] transition-all duration-200"
                  strokeWidth={isOn ? 2.3 : 1.8}
                  aria-hidden
                />
                {showDot && (
                  <span
                    className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: '#B85C00',
                      boxShadow: `0 0 0 2px ${tokens.bottomNavBg}, 0 0 6px rgba(184,92,0,0.4)`,
                    }}
                    aria-hidden
                  />
                )}
              </span>

              <span
                className="relative z-10 text-[12px] font-semibold leading-none tracking-wide"
                style={{ color: isOn ? tokens.accent : tokens.textMuted }}
              >
                {tab.label}
              </span>

              {/* Active dot indicator */}
              {isOn && (
                <span
                  className="absolute bottom-1 h-1 w-1 rounded-full"
                  style={{ backgroundColor: tokens.accent }}
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

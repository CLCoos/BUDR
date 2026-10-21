'use client';

import React from 'react';
import { CalendarDays, Compass, LifeBuoy, Mic, Sun } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';
import { lysParkHubShell } from '../lib/lysTheme';

export type LysNavTab = 'nu' | 'dag' | 'vej';

type Props = {
  tokens?: LysThemeTokens;
  active: LysNavTab;
  onChange: (tab: LysNavTab) => void;
  onFortael: () => void;
  onHjaelp: () => void;
  hidden?: boolean;
  simpleMode?: boolean;
};

type Item =
  | { kind: 'tab'; id: LysNavTab; label: string; Icon: typeof Sun }
  | { kind: 'fortael' }
  | { kind: 'hjaelp' };

/**
 * Nu, Min dag og Min vej, med Fortæl som den store knap.
 * Enkel tilstand: tre store knapper, Nu, Fortæl og Hjælp.
 */
export default function LysBottomNav({
  tokens = lysParkHubShell(),
  active,
  onChange,
  onFortael,
  onHjaelp,
  hidden,
  simpleMode = false,
}: Props) {
  if (hidden) return null;

  const items: Item[] = simpleMode
    ? [{ kind: 'tab', id: 'nu', label: 'Nu', Icon: Sun }, { kind: 'fortael' }, { kind: 'hjaelp' }]
    : [
        { kind: 'tab', id: 'nu', label: 'Nu', Icon: Sun },
        { kind: 'tab', id: 'dag', label: 'Min dag', Icon: CalendarDays },
        { kind: 'fortael' },
        { kind: 'tab', id: 'vej', label: 'Min vej', Icon: Compass },
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
        className={`grid min-h-[64px] w-full items-end px-2 pt-1.5 ${simpleMode ? 'grid-cols-3' : 'grid-cols-4'}`}
      >
        {items.map((item) => {
          if (item.kind === 'fortael') {
            return (
              <button
                key="fortael"
                type="button"
                onClick={onFortael}
                className="flex min-h-[56px] flex-col items-center justify-end gap-1"
                aria-label="Fortæl: tal eller skriv"
              >
                <span
                  className="-mt-7 flex h-[58px] w-[58px] items-center justify-center rounded-full text-white transition-transform active:scale-95"
                  style={{
                    backgroundColor: tokens.accent,
                    boxShadow: `0 0 0 4px ${tokens.bg}, 0 10px 22px -8px rgba(29,158,117,0.75)`,
                  }}
                  aria-hidden
                >
                  <Mic size={26} strokeWidth={2.2} />
                </span>
                <span
                  className="text-[12px] font-semibold leading-none tracking-wide"
                  style={{ color: tokens.accentSoftText }}
                >
                  Fortæl
                </span>
              </button>
            );
          }
          if (item.kind === 'hjaelp') {
            return (
              <button
                key="hjaelp"
                type="button"
                onClick={onHjaelp}
                className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl"
                style={{ color: tokens.text }}
              >
                <LifeBuoy className="h-[24px] w-[24px]" strokeWidth={2} aria-hidden />
                <span className="text-[12px] font-semibold leading-none tracking-wide">Hjælp</span>
              </button>
            );
          }
          const isOn = active === item.id;
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className="relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-200"
              style={{ color: isOn ? tokens.accent : tokens.textMuted }}
              aria-current={isOn ? 'page' : undefined}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={isOn ? 2.3 : 1.8} aria-hidden />
              <span className="text-[12px] font-semibold leading-none tracking-wide">
                {item.label}
              </span>
              {isOn && (
                <span
                  className="absolute bottom-0.5 h-1 w-4 rounded-full"
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

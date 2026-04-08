'use client';

import React from 'react';
import { CalendarDays, Home, Menu, PlusCircle } from 'lucide-react';

export type LysNavTab = 'hjem' | 'dag' | 'journal' | 'mig';

type Props = {
  active: LysNavTab;
  onChange: (tab: LysNavTab) => void;
  onCheckIn: () => void;
  onCrisis?: () => void;
  onMore: () => void;
  isMoreOpen: boolean;
  showDagReminderDot: boolean;
  hidden?: boolean;
  simpleMode?: boolean;
};

export default function LysBottomNav({
  active,
  onChange,
  onCheckIn,
  onCrisis,
  onMore,
  isMoreOpen,
  showDagReminderDot,
  hidden,
  simpleMode = false,
}: Props) {
  if (hidden) return null;

  const tabs = simpleMode
    ? [
        { id: 'hjem', label: 'Hjem', Icon: Home, onPress: () => onChange('hjem') },
        { id: 'checkin', label: 'Check-in', Icon: PlusCircle, onPress: onCheckIn },
        { id: 'krise', label: 'Hjælp', Icon: Menu, onPress: () => onCrisis?.() },
      ]
    : [
        { id: 'hjem', label: 'Hjem', Icon: Home, onPress: () => onChange('hjem') },
        {
          id: 'dag',
          label: 'Kalender',
          Icon: CalendarDays,
          onPress: () => onChange('dag'),
        },
        { id: 'checkin', label: 'Check-in', Icon: PlusCircle, onPress: onCheckIn },
        { id: 'mere', label: 'Mere', Icon: Menu, onPress: onMore },
      ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl"
      style={{
        backgroundColor: 'rgba(247,245,241,0.94)',
        borderTop: '1px solid #E8E3DA',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
      aria-label="Hovedmenu"
    >
      <div
        className={`mx-auto grid min-h-[64px] max-w-lg items-stretch px-2 ${simpleMode ? 'grid-cols-3' : 'grid-cols-4'}`}
      >
        {tabs.map((tab) => {
          const isOn = tab.id === 'mere' ? isMoreOpen : active === (tab.id as LysNavTab);
          const Icon = tab.Icon;
          const showDot = tab.id === 'dag' && showDagReminderDot;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onPress}
              className="relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200"
              style={{
                backgroundColor: isOn ? '#EBF0FD' : 'transparent',
                color: isOn ? '#2D5BE3' : '#6B6459',
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
                      boxShadow: '0 0 0 2px rgba(247,245,241,0.94), 0 0 6px rgba(184,92,0,0.4)',
                    }}
                    aria-hidden
                  />
                )}
              </span>

              <span
                className="relative z-10 text-[11px] font-semibold leading-none tracking-wide"
                style={{ color: isOn ? '#2D5BE3' : '#6B6459' }}
              >
                {tab.label}
              </span>

              {/* Active dot indicator */}
              {isOn && (
                <span
                  className="absolute bottom-1 h-1 w-1 rounded-full"
                  style={{ backgroundColor: '#2D5BE3' }}
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

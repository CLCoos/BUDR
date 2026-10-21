'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';

/** Demo: seneste besked til personalet (kun i browseren, så kvitteringen kan vises). */
export const DEMO_STAFF_MESSAGE_KEY = 'budr_lys_demo_staff_message';

/** Demo: dagens tjek-ind gemmes i browseren under denne nøgle. */
export function demoCheckinKey(d: Date): string {
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `budr_lys_checkin_${ymd}`;
}

/** Demo: hvem er på vagt, så forsiden ikke er tom. */
export const DEMO_ON_CALL: Record<'day' | 'evening' | 'night', string> = {
  day: 'Sara Kjær',
  evening: 'Mette Holm',
  night: 'Jonas Berg',
};

/** Solgul flade til det vigtigste på skærmen (tjek-ind, Hjælp). */
export function lysSun(dark: boolean): { soft: string; border: string } {
  return dark
    ? { soft: 'rgba(233,162,59,0.16)', border: 'rgba(233,162,59,0.45)' }
    : { soft: '#fbecd2', border: 'rgba(233,162,59,0.55)' };
}

/** Fem humørfarver fra «Rigtig godt» til «Meget svært». */
export function lysMoodColors(dark: boolean): readonly string[] {
  return dark
    ? ['#4cc79a', '#8fd18a', '#e9c46a', '#f0a05a', '#e8735f']
    : ['#1d9e75', '#7cbf6b', '#e2b23f', '#e88a3c', '#d9583f'];
}

export function LysCard({
  tokens,
  labelledBy,
  children,
}: {
  tokens: LysThemeTokens;
  labelledBy?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="flex flex-col gap-3 rounded-3xl border p-5"
      style={{ backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder }}
      aria-labelledby={labelledBy}
    >
      {children}
    </section>
  );
}

export function LysLabel({
  tokens,
  id,
  children,
}: {
  tokens: LysThemeTokens;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-[13px] font-semibold uppercase tracking-[0.08em]"
      style={{ color: tokens.textMuted }}
    >
      {children}
    </h2>
  );
}

/** Én række i en liste: ikon, titel, lille forklaring og en pil. */
export function LysLinkRow({
  tokens,
  icon,
  title,
  sub,
  onClick,
}: {
  tokens: LysThemeTokens;
  icon: React.ReactNode;
  title: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[60px] w-full items-center gap-3 rounded-2xl px-1 py-2 text-left transition-opacity active:opacity-70"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: tokens.accentSoft, color: tokens.accentSoftText }}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold" style={{ color: tokens.text }}>
          {title}
        </span>
        {sub && (
          <span className="block text-sm" style={{ color: tokens.textMuted }}>
            {sub}
          </span>
        )}
      </span>
      <ChevronRight size={18} style={{ color: tokens.textMuted }} aria-hidden />
    </button>
  );
}

/**
 * Demo: læser den seneste besked fra browseren. En kollega «ser» den to minutter efter,
 * så kvitteringen kan vises uden en rigtig portal.
 */
export function readDemoStaffMessage(
  seenBy: string
): { sentAt: string; seenAt: string | null; seenBy: string } | null {
  try {
    const raw = localStorage.getItem(DEMO_STAFF_MESSAGE_KEY);
    const sent = raw ? (JSON.parse(raw) as { sentAt: string }) : null;
    if (!sent) return null;
    const seenAt = new Date(Date.parse(sent.sentAt) + 2 * 60000);
    return {
      sentAt: sent.sentAt,
      seenAt: seenAt.getTime() <= Date.now() ? seenAt.toISOString() : null,
      seenBy,
    };
  } catch {
    return null;
  }
}

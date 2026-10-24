import React from 'react';

/**
 * Én farveregel for mærker i hele portalen:
 * rød = skal gøres nu, gul = følges op i dag, grå = information.
 * Almindelige bogstaver, så det læses som tekst og ikke som en alarm.
 */
export type StatusTone = 'now' | 'today' | 'info';

const TONES: Record<StatusTone, { bg: string; fg: string }> = {
  now: { bg: 'var(--cp-red-dim)', fg: 'var(--cp-red)' },
  today: { bg: 'var(--cp-amber-dim)', fg: 'var(--cp-amber)' },
  info: { bg: 'var(--cp-bg3)', fg: 'var(--cp-muted)' },
};

export default function StatusTag({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[13px] font-medium leading-5 ${className ?? ''}`}
      style={{ backgroundColor: t.bg, color: t.fg }}
    >
      {children}
    </span>
  );
}

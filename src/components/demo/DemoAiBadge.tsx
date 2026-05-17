'use client';

import React from 'react';

/** Lille mærkning på AI-udkast i demoen (jf. salgs-/compliance-tydelighed). */
export default function DemoAiBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
      style={{
        borderColor: 'rgba(246, 173, 85, 0.45)',
        backgroundColor: 'var(--cp-amber-dim)',
        color: 'var(--cp-amber)',
      }}
      title="AI-output i demoen er illustration og kræver altid faglig godkendelse i drift."
    >
      <span aria-hidden>◆</span>
      AI · demo
    </span>
  );
}

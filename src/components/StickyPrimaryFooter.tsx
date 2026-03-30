'use client';

import React from 'react';

/**
 * Fast primær handling i bunden (onboarding + morning check-in).
 * Sekundære handlinger placeres i indholdet over footeren.
 */
export default function StickyPrimaryFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 border-t border-midnight-700/60 bg-midnight-900/98 backdrop-blur-xl shadow-[0_-12px_32px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="max-w-lg mx-auto px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}

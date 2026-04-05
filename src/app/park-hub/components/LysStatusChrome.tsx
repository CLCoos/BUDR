'use client';

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { LysThemeTokens } from '../lib/lysTheme';

type Props = {
  tokens: LysThemeTokens;
  isDemoMode: boolean;
};

export default function LysStatusChrome({ tokens, isDemoMode }: Props) {
  const online = useOnlineStatus();

  return (
    <>
      {!online && (
        <div
          className="sticky top-0 z-[35] flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold"
          style={{
            backgroundColor: 'rgba(180,83,9,0.95)',
            color: '#fffbeb',
            borderBottom: '1px solid rgba(255,251,235,0.25)',
          }}
          role="status"
        >
          <WifiOff className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          <span>Du er offline. Nogle ting gemmes måske først, når du har net igen.</span>
        </div>
      )}
      {isDemoMode && online && (
        <div
          className="sticky top-0 z-[35] px-4 py-1.5 text-center text-[11px] font-bold tracking-wide uppercase"
          style={{
            backgroundColor: 'rgba(99,102,241,0.2)',
            color: tokens.text,
            borderBottom: `1px solid ${tokens.cardBorder}`,
          }}
          role="status"
        >
          Demo — ingen rigtige data deles med et bosted
        </div>
      )}
    </>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';

interface Props {
  tokens: LysThemeTokens;
  accent?: string;
  reducedMotion?: boolean;
  onOpen: () => void;
}

interface StatusResponse {
  shouldShowBanner: boolean;
  daysSinceLast: number | null;
  residentAgeDays: number;
  reason: string;
}

function todayDismissKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `budr_weekly_banner_dismissed_${y}${m}${day}`;
}

function isDismissedToday(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(todayDismissKey()) === '1';
  } catch {
    return false;
  }
}

function setDismissedToday() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(todayDismissKey(), '1');
  } catch {
    // ignore
  }
}

export function LysWeeklyBanner({ tokens, accent, reducedMotion, onOpen }: Props) {
  const [shouldShow, setShouldShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isDismissedToday()) {
      setDismissed(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/lys/weekly-reflection/status', {
          credentials: 'same-origin',
        });
        if (!res.ok) return;
        const data = (await res.json()) as StatusResponse;
        if (!cancelled && data.shouldShowBanner) {
          setShouldShow(true);
        }
      } catch {
        // silent — banner er soft nudge, ingen toast på fejl
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedToday();
    setDismissed(true);
  }, []);

  if (!shouldShow || dismissed) return null;

  const accentColor = accent ?? tokens.accent;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      style={{
        position: 'relative',
        background: tokens.cardBg,
        border: `1px solid ${tokens.cardBorder}`,
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 16,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        transition: reducedMotion ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!reducedMotion) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          background: `${accentColor}15`,
          borderRadius: 12,
          padding: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Sparkles size={20} color={accentColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: tokens.text,
            marginBottom: 2,
          }}
        >
          Tid til ugens refleksion
        </div>
        <div style={{ fontSize: 13, color: tokens.textMuted, lineHeight: 1.4 }}>
          Tag et øjeblik til at tænke tilbage på din uge. Det er helt frivilligt.
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            fontWeight: 600,
            color: accentColor,
          }}
        >
          Start refleksion →
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Skjul for i dag"
        style={{
          background: 'transparent',
          border: 'none',
          color: tokens.textMuted,
          cursor: 'pointer',
          padding: 4,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

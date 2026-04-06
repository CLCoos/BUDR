'use client';

import { useId } from 'react';

export type BudrLogoProps = {
  size?: number;
  /** Mørk baggrund (#0c1118 el.lign.) — teal/blå som i designpakken */
  dark?: boolean;
  showWordmark?: boolean;
  className?: string;
};

/**
 * BUDR Care-logo (design package v1). Kræver CSS-variabler på forælder:
 * `--font-budr-wordmark` (DM Serif Display), `--font-landing-body` (DM Sans, inkl. vægt 300).
 */
export function BudrLogo({
  size = 52,
  dark = false,
  showWordmark = true,
  className,
}: BudrLogoProps) {
  const uid = useId().replace(/:/g, '');
  const gradId = `budr-grad-${uid}`;

  const teal = dark ? '#5DCAA5' : '#1D9E75';
  const blue = dark ? '#85B7EB' : '#378ADD';

  const fontSize = size * 0.54;
  const subSize = size * 0.19;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: size * 0.27,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role={showWordmark ? 'presentation' : 'img'}
        aria-hidden={showWordmark}
        aria-label={showWordmark ? undefined : 'BUDR Care'}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="26" x2="52" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={teal} />
            <stop offset="100%" stopColor={blue} />
          </linearGradient>
        </defs>
        <circle cx="26" cy="26" r="24" stroke={`url(#${gradId})`} strokeWidth="2.5" />
        <path
          d="M2 26 L13 26 L17 16 L21 36 L26 20 L30 32 L34 26 L50 26"
          stroke={`url(#${gradId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="50" cy="26" r="3.5" fill={blue} />
      </svg>

      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontFamily: 'var(--font-budr-wordmark, "DM Serif Display", Georgia, serif)',
              fontSize,
              fontWeight: 400,
              color: teal,
              lineHeight: 1,
              letterSpacing: '0.04em',
            }}
          >
            BUDR
          </span>
          <span
            style={{
              fontFamily: 'var(--font-landing-body, "DM Sans", system-ui, sans-serif)',
              fontWeight: 300,
              fontSize: subSize,
              color: blue,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            Care
          </span>
        </div>
      )}
    </div>
  );
}

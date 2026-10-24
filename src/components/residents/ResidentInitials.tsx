'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  /** Det, der står på skærmen: borgerens initialer. */
  initials: string;
  /** Vises kun ved hover eller tastaturfokus på computer. */
  fullName?: string | null;
  /** Borgerens side. Udelades, når initialerne allerede står i et link eller en knap. */
  href?: string | null;
  className?: string;
  style?: React.CSSProperties;
  /** Andet indhold end initialerne, fx en avatar-cirkel. */
  children?: ReactNode;
};

type TipPos = { left: number; top: number; above: boolean };

function canHover(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;
}

/**
 * Borgerens initialer. På computer viser hover det fulde navn og et link til borgerens side.
 * Fulde navne står aldrig fremme på skærmen (GDPR); de ses kun, når medarbejderen selv peger.
 * Boblen ligger i document.body, så den ikke klippes af kort med overflow: hidden.
 */
export default function ResidentInitials({
  initials,
  fullName,
  href,
  className,
  style,
  children,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState<TipPos | null>(null);
  const name = fullName?.trim();
  const hasTip = Boolean(name && name !== initials);

  const show = useCallback(
    (fromKeyboard: boolean) => {
      if (!hasTip || !ref.current || (!fromKeyboard && !canHover())) return;
      const r = ref.current.getBoundingClientRect();
      const above = r.top > 72;
      setPos({ left: r.left + r.width / 2, top: above ? r.top - 8 : r.bottom + 8, above });
    },
    [hasTip]
  );
  const hide = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return;
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [pos, hide]);

  const tip =
    pos && typeof document !== 'undefined'
      ? createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[10090] w-max max-w-[260px] rounded-[10px] px-3 py-2 text-left shadow-lg"
            style={{
              left: pos.left,
              top: pos.top,
              transform: `translate(-50%, ${pos.above ? '-100%' : '0'})`,
              background: '#0b1b2b',
              color: '#ffffff',
              fontFamily: 'var(--cp-font, system-ui)',
            }}
          >
            <span className="block text-[14px] font-semibold leading-snug">{name}</span>
            {href ? (
              <span className="mt-0.5 block text-[13px] leading-snug" style={{ color: '#5eead4' }}>
                Klik for at åbne borgerens side
              </span>
            ) : null}
          </span>,
          document.body
        )
      : null;

  const handlers = {
    onMouseEnter: () => show(false),
    onMouseLeave: hide,
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (e.currentTarget.matches(':focus-visible')) show(true);
    },
    onBlur: hide,
  };

  if (href) {
    return (
      <Link
        ref={(el) => {
          ref.current = el;
        }}
        href={href}
        aria-label={name ? `${initials}, ${name}. Åbn borgerens side` : undefined}
        className={`inline-flex items-center underline-offset-2 hover:underline ${className ?? ''}`}
        style={style}
        {...handlers}
      >
        {children ?? initials}
        {tip}
      </Link>
    );
  }

  return (
    <span
      ref={(el) => {
        ref.current = el;
      }}
      className={`inline-flex items-center ${className ?? ''}`}
      style={style}
      tabIndex={hasTip ? 0 : undefined}
      aria-label={name ? `${initials}, ${name}` : undefined}
      {...handlers}
    >
      {children ?? initials}
      {tip}
    </span>
  );
}

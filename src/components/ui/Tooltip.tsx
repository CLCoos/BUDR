'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import styles from './Tooltip.module.css';

type TooltipProps = {
  content: string;
  children: React.ReactElement;
};

export default function Tooltip({ content, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const childProps: React.HTMLAttributes<HTMLElement> = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    onClick: () => setOpen((prev) => !prev),
    'aria-describedby': open ? tooltipId : undefined,
  };

  return (
    <span ref={rootRef} className={styles.wrapper}>
      <span className={styles.trigger}>{React.cloneElement(children, childProps)}</span>
      {open ? (
        <span id={tooltipId} role="tooltip" className={styles.content}>
          {content}
          <span className={styles.arrow} aria-hidden />
        </span>
      ) : null}
    </span>
  );
}

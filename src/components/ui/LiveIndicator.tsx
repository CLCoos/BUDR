'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import styles from './LiveIndicator.module.css';

export type LiveIndicatorProps = {
  label?: string;
  live?: boolean;
  className?: string;
};

export function LiveIndicator({ label, live = true, className }: LiveIndicatorProps) {
  const text = label ?? (live ? 'Live' : 'Offline');
  return (
    <span className={cn(styles.root, !live && styles.offline, className)}>
      <span className={styles.dotWrap} aria-hidden>
        <span className={styles.pulse} />
        <span className={styles.dot} />
      </span>
      {text}
    </span>
  );
}

'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import styles from './LiveIndicator.module.css';

export type LiveIndicatorProps = {
  label?: string;
  className?: string;
};

export function LiveIndicator({ label = 'Live', className }: LiveIndicatorProps) {
  return (
    <span className={cn(styles.root, className)}>
      <span className={styles.dotWrap} aria-hidden>
        <span className={styles.pulse} />
        <span className={styles.dot} />
      </span>
      {label}
    </span>
  );
}

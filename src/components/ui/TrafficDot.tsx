'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import styles from './TrafficDot.module.css';

export type TrafficValue = 'red' | 'yellow' | 'green' | 'none';
export type TrafficDotSize = 'sm' | 'md' | 'lg';

type TrafficDotProps = {
  value: TrafficValue;
  size?: TrafficDotSize;
  ariaLabel?: string;
  className?: string;
};

const LABELS: Record<TrafficValue, string> = {
  red: 'Rød — beboeren har det svært i dag',
  yellow: 'Gul — beboeren har det ujævnt',
  green: 'Grøn — beboeren har det godt',
  none: 'Ingen check-in endnu',
};

const DIMENSIONS: Record<TrafficDotSize, number> = {
  sm: 8,
  md: 12,
  lg: 16,
};

export function TrafficDot({ value, size = 'md', ariaLabel, className }: TrafficDotProps) {
  const px = DIMENSIONS[size];
  return (
    <span
      role="img"
      aria-label={ariaLabel ?? LABELS[value]}
      className={cn(styles.dot, styles[value], className)}
      style={{ width: px, height: px }}
    />
  );
}

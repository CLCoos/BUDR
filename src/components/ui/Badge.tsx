'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import styles from './Badge.module.css';

export type BadgeVariant = 'ok' | 'attention' | 'action' | 'neutral' | 'info' | 'muted';
export type BadgeSize = 'sm' | 'md';

export type BadgeProps = {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>;

const variantClass: Record<BadgeVariant, string> = {
  ok: styles.ok,
  attention: styles.attention,
  action: styles.action,
  neutral: styles.neutral,
  info: styles.info,
  muted: styles.muted,
};

export function Badge({
  variant = 'muted',
  size = 'md',
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span className={cn(styles.badge, styles[size], variantClass[variant], className)} {...rest}>
      {dot ? <span className={styles.dot} aria-hidden /> : null}
      {children}
    </span>
  );
}

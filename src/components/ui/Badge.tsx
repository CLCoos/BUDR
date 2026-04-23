'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import styles from './Badge.module.css';

export type BadgeVariant = 'ok' | 'attention' | 'action' | 'neutral' | 'info' | 'muted';

export type BadgeProps = {
  variant?: BadgeVariant;
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

export function Badge({ variant = 'muted', className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn(styles.badge, variantClass[variant], className)} {...rest}>
      {children}
    </span>
  );
}

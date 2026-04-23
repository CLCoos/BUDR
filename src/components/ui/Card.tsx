'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import styles from './Card.module.css';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardStatusBorder = 'ok' | 'attention' | 'action' | 'neutral' | 'info';

export type CardProps = {
  padding?: CardPadding;
  statusBorder?: CardStatusBorder;
  interactive?: boolean;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

const paddingClass: Record<CardPadding, string> = {
  none: styles.paddingNone,
  sm: styles.paddingSm,
  md: styles.paddingMd,
  lg: styles.paddingLg,
};

const statusClass: Record<CardStatusBorder, string> = {
  ok: styles.statusOk,
  attention: styles.statusAttention,
  action: styles.statusAction,
  neutral: styles.statusNeutral,
  info: styles.statusInfo,
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    padding = 'md',
    statusBorder,
    interactive = false,
    className,
    children,
    onClick,
    onKeyDown,
    role,
    tabIndex,
    ...rest
  },
  ref
) {
  const keyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (!interactive || !onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
    }
  };

  return (
    <div
      ref={ref}
      role={interactive ? 'button' : role}
      tabIndex={interactive ? 0 : tabIndex}
      onClick={onClick}
      onKeyDown={interactive || onKeyDown ? keyDown : undefined}
      className={cn(
        styles.card,
        paddingClass[padding],
        statusBorder && statusClass[statusBorder],
        interactive && styles.interactive,
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

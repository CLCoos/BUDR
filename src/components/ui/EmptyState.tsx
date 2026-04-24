'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import styles from './EmptyState.module.css';

export type EmptyStateProps = {
  variant?: 'default' | 'positive' | 'action';
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  variant = 'default',
  icon,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(styles.root, styles[variant], className)}>
      {icon ? <div className={styles.icon}>{icon}</div> : null}
      <h2 className={styles.title}>{title}</h2>
      {description ? <p className={styles.description}>{description}</p> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

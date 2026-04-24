'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import styles from './PageHeader.module.css';

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  breadcrumbs?: React.ReactNode;
  liveIndicator?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: string[];
  activeTab?: string;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  liveIndicator,
  actions,
  tabs,
  activeTab,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn(styles.root, className)}>
      <div className={styles.text}>
        {breadcrumbs ? <div className={styles.breadcrumbs}>{breadcrumbs}</div> : null}
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        {liveIndicator ? <div className={styles.meta}>{liveIndicator}</div> : null}
        {tabs?.length ? (
          <div className={styles.tabs}>
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={cn(styles.tab, activeTab === tab && styles.tabActive)}
                aria-pressed={activeTab === tab}
              >
                {tab}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

'use client';

import React from 'react';
import { Search, List } from 'lucide-react';
import {
  TrafficLightFilter,
  type TrafficFilterValue,
} from '@/components/patterns/TrafficLightFilter';
import { cn } from '@/lib/cn';
import styles from './FilterBar.module.css';

export type FilterBarSelectOption = { value: string; label: string };

export type FilterBarProps = {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  trafficFilter: TrafficFilterValue;
  onTrafficFilterChange: (value: TrafficFilterValue) => void;
  trafficCounts?: Partial<Record<TrafficFilterValue, number>>;
  /** Hus/afdeling — valgfri */
  departmentLabel?: string;
  departmentOptions?: FilterBarSelectOption[];
  departmentValue?: string;
  onDepartmentChange?: (value: string) => void;
  actions?: React.ReactNode;
  /** Sticky under header på små skærme */
  stickyOnMobile?: boolean;
  className?: string;
};

export function FilterBar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  trafficFilter,
  onTrafficFilterChange,
  trafficCounts,
  departmentLabel = 'Hus',
  departmentOptions,
  departmentValue,
  onDepartmentChange,
  actions,
  stickyOnMobile,
  className,
}: FilterBarProps) {
  return (
    <div className={cn(styles.root, stickyOnMobile && styles.stickyOnMobile, className)}>
      <div className={styles.searchWrap}>
        <Search size={14} className={styles.searchIcon} aria-hidden />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className={styles.searchInput}
          aria-label={searchPlaceholder}
        />
      </div>
      <TrafficLightFilter
        value={trafficFilter}
        onChange={onTrafficFilterChange}
        counts={trafficCounts}
        size="sm"
      />
      {departmentOptions && departmentOptions.length > 0 && onDepartmentChange ? (
        <label className={styles.selectWrap}>
          <span className={styles.selectLabel}>{departmentLabel}</span>
          <select
            className={styles.select}
            value={departmentValue ?? 'alle'}
            onChange={(e) => onDepartmentChange(e.target.value)}
            aria-label={`${departmentLabel} filter`}
          >
            {departmentOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

/** Kompakt knap til listevisning (komfortabel / kompakt). */
export function FilterBarDensityToggle(props: {
  density: 'compact' | 'comfortable';
  onToggle: () => void;
}) {
  const { density, onToggle } = props;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={styles.densityBtn}
      aria-pressed={density === 'compact'}
    >
      <List size={14} aria-hidden />
      <span>{density === 'comfortable' ? 'Kompakt' : 'Komfortabel'}</span>
    </button>
  );
}

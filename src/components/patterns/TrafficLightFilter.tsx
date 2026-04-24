'use client';

import React from 'react';
import { TrafficDot, type TrafficValue } from '@/components/ui/TrafficDot';
import { cn } from '@/lib/cn';
import styles from './TrafficLightFilter.module.css';

export type TrafficFilterValue = 'all' | TrafficValue;

type TrafficLightFilterProps = {
  value: TrafficFilterValue;
  onChange: (value: TrafficFilterValue) => void;
  size?: 'sm' | 'md';
  showLabels?: boolean;
  counts?: Partial<Record<TrafficFilterValue, number>>;
};

const OPTIONS: Array<{ value: TrafficFilterValue; label: string }> = [
  { value: 'all', label: 'Alle' },
  { value: 'red', label: 'Rød' },
  { value: 'yellow', label: 'Gul' },
  { value: 'green', label: 'Grøn' },
  { value: 'none', label: 'Ingen' },
];

export function TrafficLightFilter({
  value,
  onChange,
  size = 'md',
  showLabels,
  counts,
}: TrafficLightFilterProps) {
  const labelsVisible = showLabels ?? size === 'md';
  return (
    <div
      role="radiogroup"
      aria-label="Filtrér efter trafiklys"
      className={cn(styles.group, size === 'sm' && styles.sizeSm)}
    >
      {OPTIONS.map((option) => {
        const isSelected = value === option.value;
        const count = counts?.[option.value];
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(styles.chip, isSelected && styles.selected)}
          >
            {option.value !== 'all' ? (
              <TrafficDot value={option.value} size="sm" ariaLabel={option.label} />
            ) : null}
            {labelsVisible ? <span className={styles.label}>{option.label}</span> : null}
            {count !== undefined ? <span className={styles.count}>{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

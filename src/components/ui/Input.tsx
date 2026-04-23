'use client';

import React, { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';
import styles from './Input.module.css';

export type InputProps = {
  label?: string;
  hint?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id: idProp, disabled, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const describedBy =
    [hint && !error ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className={styles.field}>
      {label ? (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={id}
        disabled={disabled}
        className={cn(styles.input, error && styles.error, className)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {hint && !error ? (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-err`} className={cn(styles.hint, styles.hintError)} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
});

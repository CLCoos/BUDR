'use client';

import React, { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';
import styles from './Input.module.css';

export type InputProps = {
  inputSize?: 'sm' | 'md' | 'lg';
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    inputSize = 'md',
    label,
    hint,
    error,
    leftIcon,
    rightElement,
    className,
    id: idProp,
    disabled,
    ...rest
  },
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
      <div className={styles.control}>
        {leftIcon ? <span className={styles.leftIcon}>{leftIcon}</span> : null}
        <input
          ref={ref}
          id={id}
          disabled={disabled}
          className={cn(
            styles.input,
            styles[inputSize],
            Boolean(leftIcon) && styles.withLeftIcon,
            Boolean(rightElement) && styles.withRightElement,
            error && styles.error,
            className
          )}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {rightElement ? <span className={styles.rightElement}>{rightElement}</span> : null}
      </div>
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

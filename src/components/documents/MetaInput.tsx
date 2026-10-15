'use client';

import React, { useEffect, useState } from 'react';
import type { MetaFieldDefinition } from '@/lib/documents/registry';
import { Field, inputStyle } from './shared';

/** Ét metadatafelt (dato, tekst eller valg). Gemmer når feltet forlades eller et valg ændres. */
export function MetaInput({
  field,
  value,
  disabled,
  onCommit,
  onValue,
}: {
  field: MetaFieldDefinition;
  value: string;
  disabled?: boolean;
  /** Kaldes når værdien skal gemmes (blur/valg). */
  onCommit?: (value: string) => void;
  /** Kaldes ved hver ændring (formularer uden autosave). */
  onValue?: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  const change = (v: string) => {
    setLocal(v);
    onValue?.(v);
  };
  const className = 'min-h-[40px] rounded-lg border px-3 py-2 text-sm';
  const label = field.required ? `${field.label} *` : field.label;

  if (field.kind === 'select') {
    return (
      <Field label={label}>
        <select
          disabled={disabled}
          required={field.required}
          value={local}
          onChange={(e) => {
            change(e.target.value);
            onCommit?.(e.target.value);
          }}
          className={className}
          style={inputStyle}
        >
          {!field.required && <option value="">—</option>}
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  return (
    <Field label={label}>
      <input
        type={field.kind === 'date' ? 'date' : 'text'}
        disabled={disabled}
        required={field.required}
        maxLength={field.kind === 'text' ? (field.max ?? 500) : undefined}
        placeholder={field.placeholder}
        value={local}
        onChange={(e) => change(e.target.value)}
        onBlur={() => onCommit?.(local)}
        className={className}
        style={inputStyle}
      />
    </Field>
  );
}

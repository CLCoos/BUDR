'use client';

import React, { useState } from 'react';
import { CalendarPlus, CheckSquare, FileText, Loader2, Pill } from 'lucide-react';
import { ghostButton, inputStyle, primaryButton } from '@/components/documents/shared';
import {
  ACTION_LABELS,
  JOURNAL_CATEGORIES,
  type AssistantAction,
  type JournalCategoryKey,
} from '@/lib/assistant/actions';
import { PLANNER_APPOINTMENT_TYPES, type PlannerAppointmentType } from '@/lib/plannerEntries';

const PLANNER_LABELS: Record<PlannerAppointmentType, string> = {
  laege: 'Læge/sundhed',
  aktivitet: 'Aktivitet',
  intern: 'Internt',
  transport: 'Transport',
  andet: 'Andet',
};

const ICONS: Record<AssistantAction['type'], typeof FileText> = {
  journal_note: FileText,
  task: CheckSquare,
  calendar: CalendarPlus,
  medication_request: Pill,
};

const fieldClass = 'w-full rounded-lg border px-3 py-2 text-sm';
const labelClass = 'mb-1 block text-xs font-medium';

/**
 * Det assistenten vil gemme, som en tjekliste man kan rette i. Alt er slået til fra start;
 * man fjerner fluebenet ved det, der ikke skal med.
 */
export default function ActionReview({
  actions: initial,
  busy,
  confirmLabel = 'Gem det valgte',
  onConfirm,
  onCancel,
}: {
  actions: AssistantAction[];
  busy: boolean;
  confirmLabel?: string;
  onConfirm: (actions: AssistantAction[]) => void;
  onCancel: () => void;
}) {
  const [actions, setActions] = useState(initial);
  const [off, setOff] = useState<Set<string>>(new Set());

  const update = (id: string, patch: Partial<AssistantAction>) =>
    setActions((list) =>
      list.map((a) => (a.id === id ? ({ ...a, ...patch } as AssistantAction) : a))
    );
  const toggle = (id: string) =>
    setOff((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const chosen = actions.filter((a) => !off.has(a.id));

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {actions.map((a) => {
          const Icon = ICONS[a.type];
          const enabled = !off.has(a.id);
          return (
            <li
              key={a.id}
              className="rounded-xl border p-3 transition-opacity"
              style={{
                borderColor: enabled ? 'var(--cp-green)' : 'var(--cp-border)',
                backgroundColor: 'var(--cp-bg3)',
                opacity: enabled ? 1 : 0.6,
              }}
            >
              <label className="flex min-h-[40px] cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggle(a.id)}
                  className="h-5 w-5 shrink-0 accent-[var(--cp-green)]"
                />
                <Icon size={18} style={{ color: 'var(--cp-green)' }} aria-hidden />
                <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                  {ACTION_LABELS[a.type]}
                </span>
              </label>
              {enabled && (
                <div className="mt-2 space-y-2 sm:pl-[3.25rem]">
                  <ActionFields action={a} onChange={(p) => update(a.id, p)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || chosen.length === 0}
          onClick={() => onConfirm(chosen)}
          className={primaryButton}
          style={{ backgroundColor: 'var(--cp-green)' }}
        >
          {busy && <Loader2 size={15} className="animate-spin" aria-hidden />}
          {confirmLabel} ({chosen.length})
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={ghostButton}
          style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
        >
          Annuller
        </button>
      </div>
    </div>
  );
}

function ActionFields({
  action: a,
  onChange,
}: {
  action: AssistantAction;
  onChange: (patch: Partial<AssistantAction>) => void;
}) {
  const muted = { color: 'var(--cp-muted)' };
  switch (a.type) {
    case 'journal_note':
      return (
        <>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kategori">
            {JOURNAL_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={a.category === c}
                onClick={() => onChange({ category: c as JournalCategoryKey })}
                className="min-h-[34px] rounded-full border px-3 text-xs font-medium"
                style={
                  a.category === c
                    ? {
                        borderColor: 'var(--cp-green)',
                        backgroundColor: 'var(--cp-green-dim)',
                        color: 'var(--cp-green)',
                      }
                    : { borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }
                }
              >
                {c}
              </button>
            ))}
          </div>
          <textarea
            value={a.text}
            onChange={(e) => onChange({ text: e.target.value })}
            rows={Math.min(10, Math.max(4, Math.ceil(a.text.length / 50)))}
            className={fieldClass}
            style={inputStyle}
            aria-label="Notatets tekst"
          />
          <p className="text-xs" style={muted}>
            Gemmes som kladde i journalen, så du eller en leder kan godkende den.
          </p>
        </>
      );
    case 'task':
      return (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={a.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className={fieldClass}
            style={inputStyle}
            aria-label="Opgave"
          />
          <label className="text-xs" style={muted}>
            <span className="sr-only">Frist</span>
            <input
              type="date"
              value={a.deadline}
              onChange={(e) => e.target.value && onChange({ deadline: e.target.value })}
              className={fieldClass}
              style={inputStyle}
              aria-label="Frist"
            />
          </label>
        </div>
      );
    case 'calendar':
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} style={muted}>
              Hvad
              <input
                value={a.title}
                onChange={(e) => onChange({ title: e.target.value })}
                className={`${fieldClass} mt-1`}
                style={inputStyle}
              />
            </label>
          </div>
          <label className={labelClass} style={muted}>
            Dato
            <input
              type="date"
              value={a.date}
              onChange={(e) => e.target.value && onChange({ date: e.target.value })}
              className={`${fieldClass} mt-1`}
              style={inputStyle}
            />
          </label>
          <label className={labelClass} style={muted}>
            Klokken
            <input
              type="time"
              value={a.time}
              onChange={(e) => e.target.value && onChange({ time: e.target.value })}
              className={`${fieldClass} mt-1`}
              style={inputStyle}
            />
          </label>
          <label className={labelClass} style={muted}>
            Hvor
            <input
              value={a.location}
              onChange={(e) => onChange({ location: e.target.value })}
              className={`${fieldClass} mt-1`}
              style={inputStyle}
            />
          </label>
          <label className={labelClass} style={muted}>
            Type
            <select
              value={a.category}
              onChange={(e) => onChange({ category: e.target.value as PlannerAppointmentType })}
              className={`${fieldClass} mt-1`}
              style={inputStyle}
            >
              {PLANNER_APPOINTMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PLANNER_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
      );
    case 'medication_request':
      return (
        <>
          <textarea
            value={a.text}
            onChange={(e) => onChange({ text: e.target.value })}
            rows={3}
            className={fieldClass}
            style={inputStyle}
            aria-label="Besked til medicinansvarlig"
          />
          <p className="text-xs" style={muted}>
            Bliver en opgave med høj prioritet til den medicinansvarlige. Medicinlisten ændres ikke
            automatisk.
          </p>
        </>
      );
  }
}

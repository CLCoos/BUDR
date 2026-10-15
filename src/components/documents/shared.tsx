'use client';

import React from 'react';
import { CheckCircle2, Clock, FileEdit, History, Lock } from 'lucide-react';
import { dueLabel, dueState } from '@/lib/documents/deadlines';
import { DOCUMENT_STATUS_LABELS, type DocumentStatus } from '@/lib/documents/types';

export const cardStyle: React.CSSProperties = {
  borderColor: 'var(--cp-border)',
  backgroundColor: 'var(--cp-bg2)',
};
export const inputStyle: React.CSSProperties = {
  borderColor: 'var(--cp-border)',
  backgroundColor: 'var(--cp-bg3)',
  color: 'var(--cp-text)',
};
export const ghostButton =
  'inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-opacity disabled:opacity-50';
export const primaryButton =
  'inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: Record<string, unknown>
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new ApiError(
      json.error ?? `Fejl (${res.status})`,
      res.status,
      json as Record<string, unknown>
    );
  }
  return json;
}

export function todayYmd(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Copenhagen' });
}

const STATUS_STYLE: Record<DocumentStatus, { bg: string; fg: string; Icon: typeof Lock }> = {
  kladde: { bg: 'var(--cp-amber-dim)', fg: 'var(--cp-amber)', Icon: FileEdit },
  til_godkendelse: { bg: 'var(--cp-blue-dim)', fg: 'var(--cp-blue)', Icon: Clock },
  godkendt: { bg: 'var(--cp-green-dim)', fg: 'var(--cp-green)', Icon: CheckCircle2 },
  erstattet: { bg: 'var(--cp-bg3)', fg: 'var(--cp-muted)', Icon: History },
};

export function StatusChip({ status }: { status: DocumentStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      <s.Icon size={12} aria-hidden />
      {DOCUMENT_STATUS_LABELS[status]}
    </span>
  );
}

export function DueChip({ dueDate, status }: { dueDate: string | null; status: DocumentStatus }) {
  if (!dueDate || status === 'godkendt' || status === 'erstattet') return null;
  const today = todayYmd();
  const state = dueState(dueDate, today);
  const urgent = state === 'overskredet' || state === 'i_dag';
  const soon = state === 'snart';
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        backgroundColor: urgent
          ? 'var(--cp-red-dim)'
          : soon
            ? 'var(--cp-amber-dim)'
            : 'var(--cp-bg3)',
        color: urgent ? 'var(--cp-red)' : soon ? 'var(--cp-amber)' : 'var(--cp-muted)',
      }}
    >
      <Clock size={12} aria-hidden />
      {dueLabel(dueDate, today)}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>
      {label}
      {children}
      {hint ? (
        <span className="font-normal" style={{ color: 'var(--cp-muted2)' }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

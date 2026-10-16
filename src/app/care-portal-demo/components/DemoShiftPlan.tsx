'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Phone } from 'lucide-react';
import { DEMO_ROLES, type DemoRole, type DemoRoleProfile } from './demoRoles';

/** Rollevælger, «Næste opgave» og «Din vagt» på demo-forsiden. Alt er lokalt. */

export function DemoRoleSwitch({
  role,
  onChange,
}: {
  role: DemoRole;
  onChange: (r: DemoRole) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>
        Se forsiden som
      </span>
      <div
        role="radiogroup"
        aria-label="Se forsiden som"
        className="grid grid-cols-2 gap-1 rounded-xl border p-1 sm:flex"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        {DEMO_ROLES.map((r) => {
          const on = r.id === role;
          return (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(r.id)}
              className="min-h-[40px] whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: on ? 'var(--cp-ink)' : 'transparent',
                color: on ? '#fff' : 'var(--cp-muted)',
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const TONE = {
  red: { bg: 'var(--cp-red-dim)', fg: 'var(--cp-red)' },
  amber: { bg: 'var(--cp-amber-dim)', fg: 'var(--cp-amber)' },
  blue: { bg: 'var(--cp-blue-dim)', fg: 'var(--cp-blue)' },
  green: { bg: 'var(--cp-green-dim)', fg: 'var(--cp-green)' },
} as const;

export function DemoNextTask({ profile }: { profile: DemoRoleProfile }) {
  const [done, setDone] = useState(false);
  useEffect(() => setDone(false), [profile.id]);
  const n = profile.next;
  const tone = TONE[n.tone];

  return (
    <section
      aria-labelledby="demo-next-title"
      className="relative overflow-hidden rounded-2xl border p-5 sm:p-6"
      style={{ backgroundColor: 'var(--cp-card-bg)', borderColor: 'var(--cp-border)' }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: tone.fg }}
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'var(--cp-muted)' }}
            >
              Din næste opgave
            </span>
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: tone.bg, color: tone.fg }}
            >
              {n.tag}
            </span>
          </div>
          <h2
            id="demo-next-title"
            className="m-0 text-lg font-semibold leading-snug sm:text-xl"
            style={{ color: 'var(--cp-text)', letterSpacing: '-0.01em' }}
          >
            {n.title}
          </h2>
          <p
            className="mt-1.5 max-w-[60ch] text-sm leading-relaxed"
            style={{ color: 'var(--cp-muted)' }}
          >
            {n.body}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
          {done ? (
            <span
              role="status"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold"
              style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
            >
              <Check size={18} aria-hidden />
              Klaret (demo)
            </span>
          ) : n.action.href ? (
            <Link
              href={n.action.href}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
            >
              {n.action.label}
              <ArrowRight size={18} aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setDone(true)}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
            >
              <Check size={18} aria-hidden />
              {n.action.label}
            </button>
          )}
          {n.secondary && !done && (
            <button
              type="button"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-5 text-[15px] font-medium"
              style={{
                borderColor: 'var(--cp-border2)',
                backgroundColor: 'var(--cp-bg2)',
                color: 'var(--cp-text)',
              }}
            >
              <Phone size={16} aria-hidden />
              {n.secondary}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function DemoShiftChecklist({ profile }: { profile: DemoRoleProfile }) {
  const initial = () =>
    Object.fromEntries(profile.tasks.map((t) => [t.id, Boolean(t.doneFromStart)]));
  const [done, setDone] = useState<Record<string, boolean>>(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDone(initial()), [profile.id]);

  const count = profile.tasks.filter((t) => done[t.id]).length;
  const total = profile.tasks.length;
  const pct = Math.round((count / total) * 100);

  return (
    <section
      aria-labelledby="demo-shift-title"
      className="flex flex-col overflow-hidden rounded-2xl border"
      style={{ backgroundColor: 'var(--cp-card-bg)', borderColor: 'var(--cp-border)' }}
    >
      <div className="border-b px-5 py-4" style={{ borderColor: 'var(--cp-border)' }}>
        <div className="flex items-baseline justify-between gap-3">
          <h2
            id="demo-shift-title"
            className="m-0 text-base font-semibold"
            style={{ color: 'var(--cp-text)' }}
          >
            Din vagt
          </h2>
          <span className="cp-num text-xs" style={{ color: 'var(--cp-muted)' }}>
            {count} af {total} klaret
          </span>
        </div>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
          {profile.shift}
        </p>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full"
          style={{ backgroundColor: 'var(--cp-bg3)' }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Klaret på vagten"
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%`, backgroundColor: 'var(--cp-green)' }}
          />
        </div>
      </div>
      <ul>
        {profile.tasks.map((t) => {
          const isDone = done[t.id];
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 border-b px-5 py-3 last:border-b-0"
              style={{ borderColor: 'var(--cp-border)' }}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                aria-label={`${t.title}: ${isDone ? 'klaret' : 'ikke klaret'}`}
                onClick={() => setDone((d) => ({ ...d, [t.id]: !d[t.id] }))}
                className="flex h-11 w-11 shrink-0 items-center justify-center -m-2"
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors"
                  style={{
                    borderColor: isDone ? 'var(--cp-green)' : 'var(--cp-border2)',
                    backgroundColor: isDone ? 'var(--cp-green)' : 'transparent',
                  }}
                >
                  {isDone && <Check size={14} strokeWidth={3} color="#fff" aria-hidden />}
                </span>
              </button>
              <span
                className="cp-num w-[64px] shrink-0 text-xs"
                style={{ color: 'var(--cp-muted)' }}
              >
                {t.time}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[15px] leading-snug"
                  style={{
                    color: isDone ? 'var(--cp-muted)' : 'var(--cp-text)',
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}
                >
                  {t.title}
                </p>
                {t.detail && !isDone && (
                  <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    {t.detail}
                  </p>
                )}
              </div>
              {t.href && !isDone && (
                <Link
                  href={t.href}
                  aria-label={`Åbn: ${t.title}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--cp-bg3)]"
                  style={{ color: 'var(--cp-green)' }}
                >
                  <ArrowRight size={18} aria-hidden />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

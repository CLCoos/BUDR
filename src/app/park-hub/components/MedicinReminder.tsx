'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { LysThemeTokens } from '../lib/lysTheme';

type ReminderRow = {
  id: string;
  label: string;
  scheduled_time: string;
  taken_at: string | null;
  date: string;
};

type Props = {
  residentId: string;
  tokens?: LysThemeTokens;
  accent?: string;
};

function minutesDiff(now: Date, hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map((n) => Number(n));
  const target = new Date(now);
  target.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

export default function MedicinReminder({ residentId, tokens, accent = '#1D9E75' }: Props) {
  const [reminder, setReminder] = useState<ReminderRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!residentId) return;
    try {
      const res = await fetch('/api/lys/medication-reminders', { method: 'GET' });
      if (!res.ok) return;
      const json = (await res.json()) as { reminders?: ReminderRow[] };
      const rows = json.reminders ?? [];
      const now = new Date();
      const active = rows.find((r) => {
        const diff = minutesDiff(now, r.scheduled_time);
        return diff <= 60 && diff >= -180;
      });
      setReminder(active ?? null);
    } catch {
      /* best-effort */
    }
  }, [residentId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (!reminder) return null;

  const now = new Date();
  const diff = minutesDiff(now, reminder.scheduled_time);
  const isLate = diff < -30;
  const dueText = isLate
    ? `Skulle tages kl. ${reminder.scheduled_time.slice(0, 5)} - ${Math.abs(diff)} minutter siden`
    : `Kl. ${reminder.scheduled_time.slice(0, 5)}`;

  const markTaken = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/lys/medication-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminder_id: reminder.id,
          minutes_late: isLate ? Math.abs(diff) : 0,
        }),
      });
      if (!res.ok) {
        toast.error('Kunne ikke gemme medicinstatus');
        return;
      }
      setReminder(null);
      toast.success('Tak - medicin registreret som taget');
    } catch {
      toast.error('Kunne ikke gemme medicinstatus');
    } finally {
      setSaving(false);
    }
  };

  const dark = tokens?.colorScheme === 'dark';
  const cardBg = isLate
    ? dark
      ? 'rgba(239,68,68,0.14)'
      : '#fdecea'
    : dark
      ? 'rgba(245,158,11,0.12)'
      : '#fef3e6';
  const cardBorder = isLate
    ? dark
      ? 'rgba(248,113,113,0.35)'
      : '#f5aaaa'
    : dark
      ? 'rgba(251,191,36,0.35)'
      : '#f5cc85';
  const titleColor = isLate ? (dark ? '#fca5a5' : '#c0392b') : dark ? '#fcd34d' : '#b85c00';
  const bodyColor = tokens?.text ?? '#1a1814';
  const mutedColor = tokens?.textMuted ?? '#6b6459';

  return (
    <div
      className="rounded-2xl border px-4 py-3 mb-3"
      style={{ background: cardBg, borderColor: cardBorder }}
      role="status"
    >
      <p className="text-sm font-semibold mb-0.5" style={{ color: titleColor }}>
        Medicinpåmindelse
      </p>
      <p className="text-sm mb-0.5" style={{ color: bodyColor }}>
        {reminder.label}
      </p>
      <p className="text-xs mb-3" style={{ color: mutedColor }}>
        {dueText}
      </p>
      <button
        type="button"
        disabled={saving}
        onClick={() => void markTaken()}
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: accent }}
      >
        {saving ? 'Gemmer…' : 'Taget'}
      </button>
    </div>
  );
}

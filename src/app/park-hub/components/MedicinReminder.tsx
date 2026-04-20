'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
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
    const supabase = createClient();
    if (!supabase) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('medication_reminders')
      .select('id, label, scheduled_time, taken_at, date')
      .eq('resident_id', residentId)
      .eq('date', today)
      .is('taken_at', null)
      .order('scheduled_time', { ascending: true });
    const rows = (data ?? []) as ReminderRow[];
    const now = new Date();
    const active = rows.find((r) => {
      const diff = minutesDiff(now, r.scheduled_time);
      return diff <= 60 && diff >= -180;
    });
    setReminder(active ?? null);
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
    const supabase = createClient();
    if (!supabase) return;
    setSaving(true);
    if (isLate) {
      const { data: residentRow } = await supabase
        .from('care_residents')
        .select('org_id')
        .eq('user_id', residentId)
        .maybeSingle();
      await supabase.from('care_portal_notifications').insert({
        resident_id: residentId,
        type: 'medication_missed',
        detail: `${reminder.label} ikke taget - ${Math.abs(diff)} minutter forsinket`,
        severity: 'roed',
        source_table: 'medication_reminders',
        org_id: (residentRow as { org_id?: string } | null)?.org_id ?? null,
      });
    }
    const { error } = await supabase
      .from('medication_reminders')
      .update({ taken_at: new Date().toISOString() })
      .eq('id', reminder.id);
    setSaving(false);
    if (error) {
      toast.error('Kunne ikke gemme medicinstatus');
      return;
    }
    setReminder(null);
    toast.success('Tak - medicin registreret som taget');
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
    <section
      className="rounded-2xl border px-4 py-4"
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
      }}
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">💊</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold" style={{ color: titleColor }}>
            {isLate ? 'Medicin ikke taget' : `Medicin om ${Math.max(diff, 0)} minutter`}
          </p>
          <p className="text-sm font-semibold" style={{ color: bodyColor }}>
            {reminder.label}
          </p>
          <p className="text-xs" style={{ color: mutedColor }}>
            {dueText}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void markTaken()}
        disabled={saving}
        className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-40"
        style={{ backgroundColor: isLate ? '#C0392B' : accent }}
      >
        {saving ? 'Gemmer…' : 'Taget ✓'}
      </button>
    </section>
  );
}

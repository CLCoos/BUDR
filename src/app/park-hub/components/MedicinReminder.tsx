'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

type ReminderRow = {
  id: string;
  label: string;
  scheduled_time: string;
  taken_at: string | null;
  date: string;
};

type Props = { residentId: string };

function minutesDiff(now: Date, hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map((n) => Number(n));
  const target = new Date(now);
  target.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

export default function MedicinReminder({ residentId }: Props) {
  const [reminder, setReminder] = useState<ReminderRow | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
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
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [residentId]);

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
      await supabase.from('care_portal_notifications').insert({
        resident_id: residentId,
        type: 'medication_missed',
        detail: `${reminder.label} ikke taget - ${Math.abs(diff)} minutter forsinket`,
        severity: 'roed',
        source_table: 'medication_reminders',
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

  return (
    <section
      className="rounded-2xl border px-4 py-4"
      style={{
        backgroundColor: isLate ? '#FDECEA' : '#FEF3E6',
        borderColor: isLate ? '#F5AAAA' : '#F5CC85',
      }}
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">💊</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: isLate ? '#C0392B' : '#B85C00' }}>
            {isLate ? 'Medicin ikke taget' : `Medicin om ${Math.max(diff, 0)} minutter`}
          </p>
          <p className="text-sm font-semibold text-[#1A1814]">{reminder.label}</p>
          <p className="text-xs text-[#6B6459]">{dueText}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void markTaken()}
        disabled={saving}
        className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-40"
        style={{ backgroundColor: isLate ? '#C0392B' : '#1D9E75' }}
      >
        {saving ? 'Gemmer…' : 'Taget ✓'}
      </button>
    </section>
  );
}

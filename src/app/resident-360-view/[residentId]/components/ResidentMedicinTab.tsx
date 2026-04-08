'use client';

import React, { useEffect, useState } from 'react';
import { Pill, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { logPortalAudit } from '@/lib/auditClient';
import type { MedDefinition } from './types';

// ── Types ─────────────────────────────────────────────────────

interface GivenRecord {
  given: boolean;
  givenAt: string;
}

type ReminderRow = {
  id: string;
  label: string;
  scheduled_time: string;
  date: string;
  taken_at: string | null;
};

const GROUP_LABELS: Record<MedDefinition['time_group'], string> = {
  morgen: 'Morgen',
  middag: 'Middag',
  aften: 'Aften',
  behoev: 'Ved behov',
};

const GROUPS: MedDefinition['time_group'][] = ['morgen', 'middag', 'aften', 'behoev'];

// ── Storage helpers ───────────────────────────────────────────

function storageKey(residentId: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `budr_med_v1_${residentId}_${today}`;
}

function loadGiven(residentId: string): Record<string, GivenRecord> {
  try {
    const raw = localStorage.getItem(storageKey(residentId));
    return raw ? (JSON.parse(raw) as Record<string, GivenRecord>) : {};
  } catch {
    return {};
  }
}

function saveGiven(residentId: string, data: Record<string, GivenRecord>) {
  try {
    localStorage.setItem(storageKey(residentId), JSON.stringify(data));
  } catch {
    // storage unavailable
  }
}

// ── Component ────────────────────────────────────────────────

interface Props {
  residentId: string;
  medications: MedDefinition[];
}

export default function ResidentMedicinTab({ residentId, medications }: Props) {
  const [given, setGiven] = useState<Record<string, GivenRecord>>({});
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [savingReminder, setSavingReminder] = useState(false);

  useEffect(() => {
    setGiven(loadGiven(residentId));
  }, [residentId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        setLoadingReminders(false);
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('medication_reminders')
        .select('id, label, scheduled_time, date, taken_at')
        .eq('resident_id', residentId)
        .eq('date', today)
        .order('scheduled_time', { ascending: true });
      if (cancelled) return;
      if (error) {
        setReminders([]);
      } else {
        setReminders((data ?? []) as ReminderRow[]);
      }
      setLoadingReminders(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [residentId]);

  async function refetchReminders() {
    const supabase = createClient();
    if (!supabase) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('medication_reminders')
      .select('id, label, scheduled_time, date, taken_at')
      .eq('resident_id', residentId)
      .eq('date', today)
      .order('scheduled_time', { ascending: true });
    if (!error) setReminders((data ?? []) as ReminderRow[]);
  }

  async function createReminder() {
    const label = newLabel.trim();
    if (!label || !newTime) return;
    const supabase = createClient();
    if (!supabase) return;
    setSavingReminder(true);
    const today = new Date().toISOString().slice(0, 10);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from('medication_reminders').insert({
      resident_id: residentId,
      label,
      scheduled_time: `${newTime}:00`,
      date: today,
      created_by: user?.id ?? null,
    });
    setSavingReminder(false);
    if (error) {
      toast.error('Kunne ikke oprette påmindelse');
      return;
    }
    setNewLabel('');
    setNewTime('08:00');
    void logPortalAudit({
      action: 'daily_plan.created',
      tableName: 'medication_reminders',
      metadata: { resident_id: residentId, label },
    });
    toast.success('Påmindelse oprettet');
    await refetchReminders();
  }

  async function toggleTaken(reminder: ReminderRow) {
    const supabase = createClient();
    if (!supabase) return;
    const nextTakenAt = reminder.taken_at ? null : new Date().toISOString();
    const { error } = await supabase
      .from('medication_reminders')
      .update({ taken_at: nextTakenAt })
      .eq('id', reminder.id);
    if (error) {
      toast.error('Kunne ikke opdatere status');
      return;
    }
    void logPortalAudit({
      action: 'daily_plan.updated',
      tableName: 'medication_reminders',
      recordId: reminder.id,
      metadata: { taken_at: nextTakenAt },
    });
    await refetchReminders();
  }

  async function deleteReminder(reminderId: string) {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from('medication_reminders').delete().eq('id', reminderId);
    if (error) {
      toast.error('Kunne ikke slette påmindelse');
      return;
    }
    void logPortalAudit({
      action: 'daily_plan.updated',
      tableName: 'medication_reminders',
      recordId: reminderId,
      metadata: { operation: 'delete' },
    });
    toast.success('Påmindelse slettet');
    await refetchReminders();
  }

  function toggle(medId: string) {
    setGiven((prev) => {
      const next = { ...prev };
      if (next[medId]?.given) {
        delete next[medId];
      } else {
        next[medId] = { given: true, givenAt: new Date().toISOString() };
      }
      saveGiven(residentId, next);
      return next;
    });
  }

  const activeMeds = medications.filter((m) => m.status === 'aktiv');
  const givenCount = activeMeds.filter((m) => given[m.id]?.given).length;
  const totalActive = activeMeds.length;
  const remindersTakenCount = reminders.filter((r) => !!r.taken_at).length;
  const remindersMissingCount = reminders.filter((r) => !r.taken_at).length;

  if (medications.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">
        Ingen mediciner registreret for denne beboer
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Medicin-navn</label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Fx Sertralin 50 mg"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0F1B2D]"
            />
          </div>
          <div className="sm:w-44">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Tidspunkt</label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0F1B2D]"
            />
          </div>
          <button
            type="button"
            onClick={() => void createReminder()}
            disabled={savingReminder || !newLabel.trim()}
            className="rounded-xl bg-[#0F1B2D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {savingReminder ? 'Gemmer…' : 'Opret påmindelse'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Dagens status: {remindersTakenCount} taget · {remindersMissingCount} mangler
        </p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <span className="text-sm font-semibold text-gray-800">Påmindelser i dag</span>
          {loadingReminders && <span className="text-xs text-gray-400">Indlæser…</span>}
        </div>
        {!loadingReminders && reminders.length === 0 ? (
          <div className="px-4 py-5 text-sm text-gray-400">Ingen påmindelser oprettet i dag.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reminders.map((reminder) => {
              const takenAt = reminder.taken_at
                ? new Date(reminder.taken_at).toLocaleTimeString('da-DK', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;
              const hhmm = reminder.scheduled_time.slice(0, 5);
              return (
                <div key={reminder.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800">{reminder.label}</p>
                    <p className="text-xs text-gray-500">Kl. {hhmm}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleTaken(reminder)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      reminder.taken_at
                        ? 'border border-[#A8DFC9] bg-[#E1F5EE] text-[#1D9E75]'
                        : 'bg-[#0F1B2D] text-white'
                    }`}
                  >
                    {reminder.taken_at ? `Taget ${takenAt}` : 'Markér taget'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteReminder(reminder.id)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600"
                  >
                    Slet
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div
        className={`rounded-xl border px-4 py-3 flex items-center justify-between ${
          givenCount === totalActive
            ? 'bg-[#E1F5EE] border-[#A8DFC9]'
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Pill
            size={16}
            className={givenCount === totalActive ? 'text-[#1D9E75]' : 'text-amber-500'}
          />
          <span
            className={`text-sm font-semibold ${givenCount === totalActive ? 'text-[#1D9E75]' : 'text-amber-700'}`}
          >
            {givenCount}/{totalActive} mediciner givet i dag
          </span>
        </div>
        {givenCount === totalActive && (
          <span className="text-xs font-medium text-[#1D9E75]">Alt givet ✓</span>
        )}
      </div>

      {/* Groups */}
      {GROUPS.map((group) => {
        const meds = medications.filter((m) => m.time_group === group && m.status !== 'stoppet');
        if (meds.length === 0) return null;

        return (
          <div key={group} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {GROUP_LABELS[group]}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {meds.map((med) => {
                const rec = given[med.id];
                const isGiven = rec?.given ?? false;
                const isPaused = med.status === 'pauseret';
                const givenAt = rec?.givenAt
                  ? new Date(rec.givenAt).toLocaleTimeString('da-DK', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : null;

                return (
                  <div key={med.id} className="px-4 py-4 flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isGiven ? 'bg-[#E1F5EE]' : isPaused ? 'bg-amber-50' : 'bg-gray-100'
                      }`}
                    >
                      <Pill
                        size={18}
                        className={
                          isGiven ? 'text-[#1D9E75]' : isPaused ? 'text-amber-400' : 'text-gray-400'
                        }
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-semibold ${isGiven ? 'text-gray-400' : 'text-gray-800'}`}
                        >
                          {med.name}
                        </span>
                        <span className="text-xs text-gray-500">{med.dose}</span>
                        {isPaused && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                            Pauseret
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                        <Clock size={10} />
                        {med.time_label} · {med.frequency}
                      </div>
                      {med.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 italic">{med.notes}</p>
                      )}
                    </div>

                    {/* Give / Given button — disabled for paused meds */}
                    <button
                      type="button"
                      disabled={isPaused}
                      onClick={() => !isPaused && toggle(med.id)}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        isPaused
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isGiven
                            ? 'bg-[#E1F5EE] text-[#1D9E75] border border-[#A8DFC9] hover:bg-[#CCF0E0]'
                            : 'bg-[#0F1B2D] text-white hover:bg-[#1a2d47] active:scale-95'
                      }`}
                    >
                      {isGiven ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Givet {givenAt}</span>
                        </>
                      ) : isPaused ? (
                        'Pauseret'
                      ) : (
                        'Giv medicin'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-gray-400 text-center pb-2">
        Medicin-status gemmes lokalt for i dag. Nulstilles automatisk ved midnat.
      </p>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { Pill, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { logPortalAudit } from '@/lib/auditClient';
import {
  MEDICATION_TIME_SLOTS,
  formatSlotLabelDa,
  isAllowedMedicationSlotTime,
  toScheduledTimeDb,
} from '@/lib/medicationScheduleSlots';
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
  const [newTime, setNewTime] = useState(MEDICATION_TIME_SLOTS[0]!.time);
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
    if (!isAllowedMedicationSlotTime(newTime)) {
      toast.error('Vælg et tidspunkt fra listen over faste medicintider');
      return;
    }
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
      scheduled_time: toScheduledTimeDb(newTime),
      date: today,
      created_by: user?.id ?? null,
    });
    setSavingReminder(false);
    if (error) {
      toast.error('Kunne ikke oprette påmindelse');
      return;
    }
    setNewLabel('');
    setNewTime(MEDICATION_TIME_SLOTS[0]!.time);
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
      <div className="py-16 text-center text-sm" style={{ color: 'var(--cp-muted)' }}>
        Ingen mediciner registreret for denne beboer
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="rounded-xl border border-[var(--cp-border)] bg-[var(--cp-bg2)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              className="mb-1 block text-xs font-semibold"
              style={{ color: 'var(--cp-muted)' }}
            >
              Medicin-navn
            </label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Fx Sertralin 50 mg"
              className="w-full rounded-lg border border-[var(--cp-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--cp-green)]"
              style={{
                backgroundColor: 'var(--cp-bg3)',
                color: 'var(--cp-text)',
              }}
            />
          </div>
          <div className="sm:min-w-[220px] sm:flex-1">
            <label
              className="mb-1 block text-xs font-semibold"
              style={{ color: 'var(--cp-muted)' }}
            >
              Tidspunkt (faste døgnpunkter)
            </label>
            <select
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full rounded-lg border border-[var(--cp-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--cp-green)]"
              style={{
                backgroundColor: 'var(--cp-bg3)',
                color: 'var(--cp-text)',
              }}
            >
              {MEDICATION_TIME_SLOTS.map((slot) => (
                <option key={slot.id} value={slot.time}>
                  {formatSlotLabelDa(slot)}
                </option>
              ))}
            </select>
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
        <p className="mt-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
          Dagens status: {remindersTakenCount} taget · {remindersMissingCount} mangler. Påmindelser
          placeres kun på typiske tidspunkter (morgen til sen aften), ikke vilkårlige minutter.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--cp-border)] bg-[var(--cp-bg2)]">
        <div className="flex items-center justify-between border-b border-[var(--cp-border)] px-4 py-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            Påmindelser i dag
          </span>
          {loadingReminders && (
            <span className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
              Indlæser…
            </span>
          )}
        </div>
        {!loadingReminders && reminders.length === 0 ? (
          <div className="px-4 py-5 text-sm" style={{ color: 'var(--cp-muted)' }}>
            Ingen påmindelser oprettet i dag.
          </div>
        ) : (
          <div className="divide-y divide-[var(--cp-border)]">
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
                    <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                      {reminder.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                      Kl. {hhmm}
                    </p>
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
                    className="rounded-lg border border-[var(--cp-border)] px-3 py-1.5 text-xs font-semibold"
                    style={{ color: 'var(--cp-muted)' }}
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
        className="flex items-center justify-between rounded-xl border px-4 py-3"
        style={
          givenCount === totalActive
            ? {
                backgroundColor: 'var(--cp-green-dim)',
                borderColor: 'rgba(45,212,160,0.35)',
              }
            : {
                backgroundColor: 'var(--cp-amber-dim)',
                borderColor: 'rgba(246,173,85,0.35)',
              }
        }
      >
        <div className="flex items-center gap-2">
          <Pill
            size={16}
            className={
              givenCount === totalActive ? 'text-[var(--cp-green)]' : 'text-[var(--cp-amber)]'
            }
          />
          <span
            className="text-sm font-semibold"
            style={{
              color: givenCount === totalActive ? 'var(--cp-green)' : 'var(--cp-amber)',
            }}
          >
            {givenCount}/{totalActive} mediciner givet i dag
          </span>
        </div>
        {givenCount === totalActive && (
          <span className="text-xs font-medium" style={{ color: 'var(--cp-green)' }}>
            Alt givet ✓
          </span>
        )}
      </div>

      {/* Groups */}
      {GROUPS.map((group) => {
        const meds = medications.filter((m) => m.time_group === group && m.status !== 'stoppet');
        if (meds.length === 0) return null;

        return (
          <div
            key={group}
            className="overflow-hidden rounded-xl border border-[var(--cp-border)] bg-[var(--cp-bg2)]"
          >
            <div
              className="border-b border-[var(--cp-border)] px-4 py-2.5"
              style={{ backgroundColor: 'var(--cp-bg3)' }}
            >
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-muted)' }}
              >
                {GROUP_LABELS[group]}
              </span>
            </div>
            <div className="divide-y divide-[var(--cp-border)]">
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
                  <div key={med.id} className="flex items-center gap-4 px-4 py-4">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: isGiven
                          ? 'var(--cp-green-dim)'
                          : isPaused
                            ? 'var(--cp-amber-dim)'
                            : 'var(--cp-bg3)',
                      }}
                    >
                      <Pill
                        size={18}
                        className={
                          isGiven
                            ? 'text-[var(--cp-green)]'
                            : isPaused
                              ? 'text-[var(--cp-amber)]'
                              : 'text-[var(--cp-muted2)]'
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color: isGiven ? 'var(--cp-muted2)' : 'var(--cp-text)',
                          }}
                        >
                          {med.name}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                          {med.dose}
                        </span>
                        {isPaused && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                            Pauseret
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-0.5 flex items-center gap-1 text-xs"
                        style={{ color: 'var(--cp-muted)' }}
                      >
                        <Clock size={10} />
                        {med.time_label} · {med.frequency}
                      </div>
                      {med.notes && (
                        <p className="mt-0.5 text-xs italic" style={{ color: 'var(--cp-muted2)' }}>
                          {med.notes}
                        </p>
                      )}
                    </div>

                    {/* Give / Given button — disabled for paused meds */}
                    <button
                      type="button"
                      disabled={isPaused}
                      onClick={() => !isPaused && toggle(med.id)}
                      className={`flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        isPaused ? 'cursor-not-allowed' : isGiven ? 'border' : ''
                      }`}
                      style={
                        isPaused
                          ? {
                              backgroundColor: 'var(--cp-bg3)',
                              color: 'var(--cp-muted2)',
                            }
                          : isGiven
                            ? {
                                backgroundColor: 'var(--cp-green-dim)',
                                color: 'var(--cp-green)',
                                borderColor: 'rgba(45,212,160,0.35)',
                              }
                            : {
                                backgroundColor: 'var(--cp-green)',
                                color: '#fff',
                              }
                      }
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

      <p className="pb-2 text-center text-xs" style={{ color: 'var(--cp-muted2)' }}>
        Medicin-status gemmes lokalt for i dag. Nulstilles automatisk ved midnat.
      </p>
    </div>
  );
}

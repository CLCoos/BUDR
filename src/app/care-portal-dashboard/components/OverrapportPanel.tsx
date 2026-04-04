'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Edit3, CheckCircle, Users, BookOpen, Activity, ClipboardList } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';

// ── Types ──────────────────────────────────────────────────────────────────────

interface JournalEntry {
  id: string;
  entry_text: string;
  category: string;
  staff_name: string;
  created_at: string;
  resident_name: string;
}

interface CheckinRow {
  resident_id: string;
  resident_name: string;
  mood_score: number;
  traffic_light: string;
  note: string | null;
  created_at: string;
}

interface PlanItem {
  title: string;
  time?: string;
  done?: boolean;
}

interface OpenTask {
  resident_name: string;
  title: string;
  time?: string;
  date: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  observation: { label: 'Observation', color: '#185FA5', bg: '#E6F1FB' },
  trivsel: { label: 'Trivsel', color: '#0F6E56', bg: '#E1F5EE' },
  aktivitet: { label: 'Aktivitet', color: '#854F0B', bg: '#FAEEDA' },
  helbred: { label: 'Helbred', color: '#7F77DD', bg: '#F5F4FF' },
};

const TRAFFIC_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  rød: { dot: '#E24B4A', bg: '#FEF2F2', text: '#B91C1C' },
  gul: { dot: '#EF9F27', bg: '#FEFCE8', text: '#854D0E' },
  grøn: { dot: '#1D9E75', bg: '#F0FDF4', text: '#15803D' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}

// ── Component ──────────────────────────────────────────────────────────────────

type Props = { open: boolean; onClose: () => void };

export default function OverrapportPanel({ open, onClose }: Props) {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [openTasks, setOpenTasks] = useState<OpenTask[]>([]);
  const [totalResidents, setTotalResidents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setEditMode(false);
      setSaved(false);
      return;
    }
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { orgId, residentIds, error: orgErr } = await resolveStaffOrgResidents(supabase);
      if (orgErr || !orgId || residentIds.length === 0) {
        if (mountedRef.current) {
          setTotalResidents(0);
          setJournals([]);
          setCheckins([]);
          setOpenTasks([]);
        }
        return;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayIso = todayStart.toISOString();
      const today = todayStart.toISOString().slice(0, 10);

      const [resResult, journalResult, checkinResult, planResult] = await Promise.all([
        supabase
          .from('care_residents')
          .select('user_id', { count: 'exact', head: true })
          .eq('org_id', orgId),
        supabase
          .from('journal_entries')
          .select('id, entry_text, category, staff_name, created_at, resident_id')
          .eq('journal_status', 'godkendt')
          .gte('created_at', todayIso)
          .in('resident_id', residentIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('park_daily_checkin')
          .select('resident_id, mood_score, traffic_light, note, created_at')
          .gte('created_at', todayIso)
          .in('resident_id', residentIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('daily_plans')
          .select('resident_id, date, plan_items')
          .lte('date', today)
          .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
          .in('resident_id', residentIds),
      ]);

      if (!mountedRef.current) return;

      setTotalResidents(resResult.count ?? 0);

      // Fetch resident names for journal entries
      const journalResidentIds = [
        ...new Set((journalResult.data ?? []).map((j: { resident_id: string }) => j.resident_id)),
      ];
      const checkinResidentIds = [
        ...new Set((checkinResult.data ?? []).map((c: { resident_id: string }) => c.resident_id)),
      ];
      const allResidentIds = [...new Set([...journalResidentIds, ...checkinResidentIds])];

      let nameMap: Record<string, string> = {};
      if (allResidentIds.length > 0) {
        const { data: residents } = await supabase
          .from('care_residents')
          .select('user_id, display_name')
          .in('user_id', allResidentIds);
        nameMap = Object.fromEntries(
          (residents ?? []).map((r: { user_id: string; display_name: string }) => [
            r.user_id,
            r.display_name,
          ])
        );
      }

      if (!mountedRef.current) return;

      setJournals(
        (journalResult.data ?? []).map(
          (j: {
            id: string;
            entry_text: string;
            category: string;
            staff_name: string;
            created_at: string;
            resident_id: string;
          }) => ({
            ...j,
            resident_name: nameMap[j.resident_id] ?? 'Ukendt beboer',
          })
        )
      );

      setCheckins(
        (checkinResult.data ?? []).map(
          (c: {
            resident_id: string;
            mood_score: number;
            traffic_light: string;
            note: string | null;
            created_at: string;
          }) => ({
            ...c,
            resident_name: nameMap[c.resident_id] ?? 'Ukendt beboer',
          })
        )
      );

      // Parse open tasks from daily_plans
      const tasks: OpenTask[] = [];
      const planResidentIds = [
        ...new Set((planResult.data ?? []).map((p: { resident_id: string }) => p.resident_id)),
      ];
      const planNameMap: Record<string, string> = { ...nameMap };
      const missingIds = planResidentIds.filter((id) => !planNameMap[id]);
      if (missingIds.length > 0) {
        const { data: planResidents } = await supabase
          .from('care_residents')
          .select('user_id, display_name')
          .in('user_id', missingIds);
        (planResidents ?? []).forEach((r: { user_id: string; display_name: string }) => {
          planNameMap[r.user_id] = r.display_name;
        });
      }

      for (const plan of (planResult.data ?? []) as {
        resident_id: string;
        date: string;
        plan_items: PlanItem[] | null;
      }[]) {
        const items = Array.isArray(plan.plan_items) ? plan.plan_items : [];
        for (const item of items) {
          if (!item.done) {
            tasks.push({
              resident_name: planNameMap[plan.resident_id] ?? 'Ukendt',
              title: item.title,
              time: item.time,
              date: plan.date,
            });
          }
        }
      }
      setOpenTasks(tasks.slice(0, 8));
    } catch {
      /* ignore */
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert({
        actor_type: 'staff',
        actor_id: user?.id ?? null,
        action: 'overrapport_approved',
        target_table: 'journal_entries',
        metadata: { approved_at: new Date().toISOString(), journal_count: journals.length },
      });
      if (mountedRef.current) {
        setSaved(true);
        setEditMode(false);
      }
    } catch {
      /* ignore */
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const attentionCheckins = checkins.filter(
    (c) => c.traffic_light === 'rød' || c.traffic_light === 'gul'
  );

  // Group journals by resident
  const journalsByResident: Record<string, JournalEntry[]> = {};
  for (const j of journals) {
    if (!journalsByResident[j.resident_name]) journalsByResident[j.resident_name] = [];
    journalsByResident[j.resident_name].push(j);
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 480 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">Overrapport</h2>
            <p className="text-xs text-gray-500">
              {new Date().toLocaleDateString('da-DK', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              {' · Dagvagt'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
              <div className="flex gap-1.5">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="w-2 h-2 bg-[#1D9E75] rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
              <p className="text-sm">Henter vagtoverblik…</p>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-6">
              {/* ── Sektion A: Vagtoverblik ──────────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-gray-400" />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Vagtoverblik
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: 'Beboere tilstede',
                      value: totalResidents,
                      color: '#1D9E75',
                      bg: '#E1F5EE',
                    },
                    {
                      label: 'Check-ins i dag',
                      value: checkins.length,
                      color: '#185FA5',
                      bg: '#E6F1FB',
                    },
                    {
                      label: 'Åbne advarsler',
                      value: attentionCheckins.length,
                      color: '#E24B4A',
                      bg: '#FEF2F2',
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl p-3 text-center"
                      style={{ backgroundColor: stat.bg }}
                    >
                      <div
                        className="text-2xl font-bold tabular-nums"
                        style={{ color: stat.color }}
                      >
                        {stat.value}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Sektion B: Journalnotater ────────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={14} className="text-gray-400" />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Journalnotater i dag
                  </h3>
                  <span className="ml-auto text-xs text-gray-400">{journals.length} noter</span>
                </div>
                {journals.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Ingen journalnotater i dag
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(journalsByResident).map(([name, entries]) => (
                      <div key={name} className="rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                          <span className="text-xs font-semibold text-gray-700">{name}</span>
                        </div>
                        {entries.map((e) => {
                          const cat = CATEGORY_LABELS[e.category] ?? CATEGORY_LABELS.observation;
                          return (
                            <div key={e.id} className="px-3 py-2.5">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: cat.bg, color: cat.color }}
                                >
                                  {cat.label}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {fmt(e.created_at)} · {e.staff_name}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                {e.entry_text}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Sektion C: Stemningsoverblik ─────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={14} className="text-gray-400" />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Stemningsoverblik
                  </h3>
                </div>
                {attentionCheckins.length === 0 ? (
                  <div className="rounded-xl bg-green-50 px-4 py-3 text-xs text-green-700 font-medium">
                    Alle beboere med check-in har grønt trafiklys ✓
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attentionCheckins.map((c) => {
                      const tc = TRAFFIC_COLORS[c.traffic_light] ?? TRAFFIC_COLORS.gul;
                      return (
                        <div
                          key={c.resident_id}
                          className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5"
                        >
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tc.dot }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-800">
                              {c.resident_name}
                            </span>
                            {c.note && <p className="text-xs text-gray-500 truncate">{c.note}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className="text-sm font-bold tabular-nums"
                              style={{ color: tc.text }}
                            >
                              {c.mood_score}
                              <span className="text-xs font-normal text-gray-400">/10</span>
                            </span>
                            <span className="text-[10px] text-gray-400">{fmt(c.created_at)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {checkins
                      .filter((c) => c.traffic_light === 'grøn')
                      .map((c) => (
                        <div
                          key={c.resident_id}
                          className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 opacity-60"
                        >
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: '#1D9E75' }}
                          />
                          <span className="text-sm text-gray-600 flex-1">{c.resident_name}</span>
                          <span className="text-sm font-bold tabular-nums text-gray-500">
                            {c.mood_score}
                            <span className="text-xs font-normal text-gray-400">/10</span>
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </section>

              {/* ── Sektion D: Åbne opgaver ───────────────────── */}
              {openTasks.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList size={14} className="text-gray-400" />
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Åbne opgaver
                    </h3>
                    <span className="ml-auto text-xs text-gray-400">{openTasks.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {openTasks.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-gray-700">{t.title}</span>
                          <span className="text-[10px] text-gray-400 ml-1.5">
                            · {t.resident_name}
                          </span>
                        </div>
                        {t.time && (
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{t.time}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Rediger-textarea ─────────────────────────── */}
              {editMode && (
                <section>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Rediger rapport
                  </label>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={6}
                    placeholder="Tilføj egne noter til rapporten…"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed resize-none outline-none focus:border-[#1D9E75] focus:bg-white transition-colors"
                  />
                </section>
              )}

              <div className="h-4" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditMode(!editMode);
              if (!editMode) setEditText('');
            }}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Edit3 className="h-4 w-4" />
            {editMode ? 'Luk redigering' : 'Rediger'}
          </button>
          <button
            type="button"
            onClick={() => void handleApprove()}
            disabled={saving || saved}
            className="ml-auto flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: saved ? '#1D9E75' : '#0F6E56' }}
          >
            <CheckCircle className="h-4 w-4" />
            {saving ? 'Gemmer…' : saved ? 'Godkendt ✓' : 'Godkend og gem'}
          </button>
        </div>
      </div>
    </>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, CheckSquare, ChevronDown, Plus, User } from 'lucide-react';

export type TaskStatus = 'åben' | 'igangsat' | 'afsluttet';
export type TaskPriority = 'lav' | 'mellem' | 'høj';

export interface CareTask {
  id: string;
  residentId: string;
  residentName: string;
  initials: string;
  title: string;
  deadline: Date;
  assignedTo: string;
  status: TaskStatus;
  priority: TaskPriority;
}

const RESIDENTS: { id: string; name: string; initials: string }[] = [
  { id: 'res-001', name: 'Anders M.', initials: 'AM' },
  { id: 'res-002', name: 'Finn L.', initials: 'FL' },
  { id: 'res-003', name: 'Kirsten R.', initials: 'KR' },
  { id: 'res-004', name: 'Maja T.', initials: 'MT' },
  { id: 'res-005', name: 'Thomas B.', initials: 'TB' },
  { id: 'res-006', name: 'Lena P.', initials: 'LP' },
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function deadlineDayLabel(deadline: Date, today: Date): 'overdue' | 'today' | 'future' {
  const dd = startOfDay(deadline).getTime();
  const td = startOfDay(today).getTime();
  if (dd < td) return 'overdue';
  if (dd === td) return 'today';
  return 'future';
}

function formatDanishShortDate(d: Date): string {
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function priorityDot(p: TaskPriority): string {
  if (p === 'høj') return 'bg-red-500';
  if (p === 'mellem') return 'bg-amber-500';
  return 'bg-gray-400';
}

function createMockTasks(ref: Date): CareTask[] {
  const y = new Date(ref);
  y.setDate(y.getDate() - 1);
  const y2 = new Date(ref);
  y2.setDate(y2.getDate() - 2);
  const t0 = startOfDay(ref);
  const t1 = new Date(t0);
  t1.setHours(17, 0, 0, 0);
  const fut = new Date(ref);
  fut.setDate(fut.getDate() + 1);

  return [
    {
      id: 'tsk-001',
      residentId: 'res-002',
      residentName: 'Finn L.',
      initials: 'FL',
      title: 'Opfølgning på kriseplan — telefon til pårørende',
      deadline: y,
      assignedTo: 'SK',
      status: 'åben',
      priority: 'høj',
    },
    {
      id: 'tsk-002',
      residentId: 'res-003',
      residentName: 'Kirsten R.',
      initials: 'KR',
      title: 'Bestille tid hos praktiserende læge',
      deadline: y2,
      assignedTo: 'LP',
      status: 'igangsat',
      priority: 'mellem',
    },
    {
      id: 'tsk-003',
      residentId: 'res-004',
      residentName: 'Maja T.',
      initials: 'MT',
      title: 'Dokumentere morgensamtale i journal',
      deadline: t0,
      assignedTo: 'SK',
      status: 'åben',
      priority: 'lav',
    },
    {
      id: 'tsk-004',
      residentId: 'res-001',
      residentName: 'Anders M.',
      initials: 'AM',
      title: 'Koordinering aktivitet med ergoterapeut',
      deadline: t1,
      assignedTo: 'BN',
      status: 'åben',
      priority: 'høj',
    },
    {
      id: 'tsk-005',
      residentId: 'res-006',
      residentName: 'Lena P.',
      initials: 'LP',
      title: 'Forberede årlig samtale — pårørende',
      deadline: fut,
      assignedTo: 'SK',
      status: 'åben',
      priority: 'mellem',
    },
  ];
}

type OpgaveWidgetProps = {
  /** I beboer-360: vis alle opgaver for denne beboer (inkl. kommende). */
  residentIdFilter?: string | null;
};

export default function OpgaveWidget({ residentIdFilter = null }: OpgaveWidgetProps) {
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState(() => new Date());
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formResidentId, setFormResidentId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formPriority, setFormPriority] = useState<TaskPriority>('mellem');
  const [formAssignee, setFormAssignee] = useState('SK');

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setTasks(createMockTasks(now));
    setFormDeadline(toDateInputValue(now));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (residentIdFilter) setFormResidentId(residentIdFilter);
  }, [residentIdFilter]);

  const isResidentScope = Boolean(residentIdFilter);

  const visibleTasks = useMemo(() => {
    let list = tasks;
    if (residentIdFilter) {
      list = list.filter(t => t.residentId === residentIdFilter);
    } else {
      const td = startOfDay(today).getTime();
      list = list.filter(t => startOfDay(t.deadline).getTime() <= td);
    }
    return list;
  }, [tasks, today, residentIdFilter]);

  const sortedTasks = useMemo(() => {
    const open = visibleTasks.filter(t => t.status !== 'afsluttet');
    const done = visibleTasks.filter(t => t.status === 'afsluttet');
    const byDeadline = (a: CareTask, b: CareTask) =>
      a.deadline.getTime() - b.deadline.getTime();
    open.sort(byDeadline);
    done.sort(byDeadline);
    return [...open, ...done];
  }, [visibleTasks]);

  const setStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status } : t)));
  }, []);

  const submitTask = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const rid = residentIdFilter ?? formResidentId;
      if (!rid || !formTitle.trim() || !formDeadline || !formAssignee.trim()) return;
      const res = RESIDENTS.find(r => r.id === rid);
      if (!res) return;
      const [y, m, d] = formDeadline.split('-').map(Number);
      const deadline = new Date(y!, m! - 1, d!, 12, 0, 0, 0);
      const newTask: CareTask = {
        id: `tsk-${Date.now()}`,
        residentId: res.id,
        residentName: res.name,
        initials: res.initials,
        title: formTitle.trim(),
        deadline,
        assignedTo: formAssignee.trim().toUpperCase().slice(0, 6),
        status: 'åben',
        priority: formPriority,
      };
      setTasks(prev => [...prev, newTask]);
      setFormTitle('');
      setFormPriority('mellem');
      setFormAssignee('SK');
      setFormDeadline(toDateInputValue(today));
      if (!residentIdFilter) setFormResidentId('');
      setShowForm(false);
    },
    [residentIdFilter, formResidentId, formTitle, formDeadline, formAssignee, formPriority, today],
  );

  if (!hydrated) {
    return (
      <div className="mb-6 w-full max-w-2xl animate-pulse rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex justify-between">
          <div className="h-8 w-40 rounded-lg bg-gray-100" />
          <div className="h-8 w-20 rounded-lg bg-gray-100" />
        </div>
        <div className="h-20 rounded-xl bg-gray-100" />
      </div>
    );
  }

  return (
    <section
      className="mb-6 w-full max-w-2xl rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
      aria-label="Opgaver"
    >
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-budr-purple" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Opgaver</h2>
            <p className="text-sm text-gray-500">
              {isResidentScope ? 'Opgaver for denne beboer' : 'Forfaldne og dagens opgaver'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(s => !s)}
          aria-expanded={showForm}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-budr-purple px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Tilføj
        </button>
      </div>

      <div
        className={`grid transition-all duration-200 ease-out ${showForm ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <form
            onSubmit={submitTask}
            className="mb-4 space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4"
          >
            {!residentIdFilter ? (
              <div>
                <label htmlFor="opg-res" className="mb-1 block text-xs font-medium text-gray-500">
                  Beboer
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <select
                    id="opg-res"
                    value={formResidentId}
                    onChange={e => setFormResidentId(e.target.value)}
                    required
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm transition-all duration-200 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal"
                  >
                    <option value="">Vælg beboer</option>
                    {RESIDENTS.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            ) : null}
            <div>
              <label htmlFor="opg-title" className="mb-1 block text-xs font-medium text-gray-500">
                Opgave
              </label>
              <input
                id="opg-title"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm transition-all duration-200 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal"
                placeholder="Kort beskrivelse…"
              />
            </div>
            <div>
              <label htmlFor="opg-deadline" className="mb-1 block text-xs font-medium text-gray-500">
                Deadline
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="opg-deadline"
                  type="date"
                  value={formDeadline}
                  onChange={e => setFormDeadline(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm transition-all duration-200 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal"
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Prioritet</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'lav' as const, label: 'Lav' },
                    { id: 'mellem' as const, label: 'Mellem' },
                    { id: 'høj' as const, label: 'Høj' },
                  ] as const
                ).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormPriority(p.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      formPriority === p.id
                        ? 'bg-budr-purple text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="opg-asg" className="mb-1 block text-xs font-medium text-gray-500">
                Ansvarlig
              </label>
              <input
                id="opg-asg"
                value={formAssignee}
                onChange={e => setFormAssignee(e.target.value)}
                placeholder="Initialer, fx SK"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm transition-all duration-200 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-budr-teal py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
            >
              Gem opgave
            </button>
          </form>
        </div>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="mb-2 h-8 w-8 text-green-500" aria-hidden />
          <p className="text-sm text-gray-400">Ingen forfaldne opgaver</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sortedTasks.map(t => {
            const done = t.status === 'afsluttet';
            const when = deadlineDayLabel(t.deadline, today);
            return (
              <li
                key={t.id}
                className={`flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md ${
                  done ? 'opacity-50' : ''
                }`}
              >
                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot(t.priority)}`} aria-hidden />
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                    style={{ backgroundColor: '#7F77DD' }}
                  >
                    {t.initials}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold text-gray-900 ${
                      done ? 'line-through decoration-gray-400' : ''
                    }`}
                  >
                    {t.title}
                  </p>
                  <p className="text-xs text-gray-400">{t.residentName}</p>
                  <div className="mt-2">
                    {when === 'overdue' ? (
                      <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        Forfaldt {formatDanishShortDate(t.deadline)}
                      </span>
                    ) : when === 'today' ? (
                      <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                        I dag
                      </span>
                    ) : (
                      <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        {formatDanishShortDate(t.deadline)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-medium text-gray-700">
                    {t.assignedTo}
                  </span>
                  <div className="relative">
                    <select
                      value={t.status}
                      onChange={e => setStatus(t.id, e.target.value as TaskStatus)}
                      aria-label={`Status for ${t.title}`}
                      className="appearance-none rounded-full border border-gray-200 bg-white py-1.5 pl-2.5 pr-8 text-xs font-medium text-gray-800 transition-all duration-200 hover:border-gray-300 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal"
                    >
                      <option value="åben">Åben</option>
                      <option value="igangsat">Igangsat</option>
                      <option value="afsluttet">Afsluttet</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        Supabase — care_tasks (wire later):

        Columns: id, facility_id, resident_id, title, deadline, assigned_to, status,
                 priority, created_by, created_at

        1) Fetch active tasks for facility / resident:
           supabase.from('care_tasks')
             .select('*')
             .in('facility_id', care_visible_facility_ids())
             .eq('resident_id', residentId) // when scoped; omit filter on dashboard
             .order('deadline', { ascending: true })

        2) Update status:
           supabase.from('care_tasks').update({ status }).eq('id', taskId)

        3) Insert on submit:
           supabase.from('care_tasks').insert({
             facility_id, resident_id, title, deadline, assigned_to, status, priority, created_by,
           })

        4) RLS: facility_id in care_visible_facility_ids() for authenticated staff.
      */}
    </section>
  );
}

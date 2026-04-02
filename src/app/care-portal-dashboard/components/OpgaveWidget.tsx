'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, CheckSquare, ChevronDown, Plus, User } from 'lucide-react';

export type TaskStatus = 'åben' | 'igangsat' | 'afsluttet';
export type TaskPriority = 'lav' | 'mellem' | 'høj';

export interface CareTask {
  id: string; residentId: string; residentName: string; initials: string;
  title: string; deadline: Date; assignedTo: string; status: TaskStatus; priority: TaskPriority;
}

const RESIDENTS = [
  { id:'res-001', name:'Anders M.',  initials:'AM' },
  { id:'res-002', name:'Finn L.',    initials:'FL' },
  { id:'res-003', name:'Kirsten R.', initials:'KR' },
  { id:'res-004', name:'Maja T.',    initials:'MT' },
  { id:'res-005', name:'Thomas B.',  initials:'TB' },
  { id:'res-006', name:'Lena P.',    initials:'LP' },
];

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function deadlineDayLabel(deadline: Date, today: Date): 'overdue' | 'today' | 'future' {
  const dd = startOfDay(deadline).getTime(); const td = startOfDay(today).getTime();
  if (dd < td) return 'overdue'; if (dd === td) return 'today'; return 'future';
}
function formatDanishShortDate(d: Date): string {
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
}
function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function priorityDotStyle(p: TaskPriority): React.CSSProperties {
  if (p === 'høj')    return { backgroundColor: 'var(--cp-red)' };
  if (p === 'mellem') return { backgroundColor: 'var(--cp-amber)' };
  return { backgroundColor: 'var(--cp-muted2)' };
}

function createMockTasks(ref: Date): CareTask[] {
  const y  = new Date(ref); y.setDate(y.getDate()-1);
  const y2 = new Date(ref); y2.setDate(y2.getDate()-2);
  const t0 = startOfDay(ref);
  const t1 = new Date(t0); t1.setHours(17,0,0,0);
  const fut = new Date(ref); fut.setDate(fut.getDate()+1);
  return [
    { id:'tsk-001', residentId:'res-002', residentName:'Finn L.',    initials:'FL', title:'Opfølgning på kriseplan — telefon til pårørende', deadline:y,   assignedTo:'SK', status:'åben',     priority:'høj'    },
    { id:'tsk-002', residentId:'res-003', residentName:'Kirsten R.', initials:'KR', title:'Bestille tid hos praktiserende læge',               deadline:y2,  assignedTo:'LP', status:'igangsat', priority:'mellem' },
    { id:'tsk-003', residentId:'res-004', residentName:'Maja T.',    initials:'MT', title:'Dokumentere morgensamtale i journal',               deadline:t0,  assignedTo:'SK', status:'åben',     priority:'lav'    },
    { id:'tsk-004', residentId:'res-001', residentName:'Anders M.',  initials:'AM', title:'Koordinering aktivitet med ergoterapeut',           deadline:t1,  assignedTo:'BN', status:'åben',     priority:'høj'    },
    { id:'tsk-005', residentId:'res-006', residentName:'Lena P.',    initials:'LP', title:'Forberede årlig samtale — pårørende',               deadline:fut, assignedTo:'SK', status:'åben',     priority:'mellem' },
  ];
}

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--cp-bg3)',
  border: '1px solid var(--cp-border2)',
  color: 'var(--cp-text)',
  borderRadius: 8,
  width: '100%',
  padding: '0.625rem 0.75rem',
  fontSize: '0.875rem',
  outline: 'none',
  colorScheme: 'dark',
};

type OpgaveWidgetProps = { residentIdFilter?: string | null };

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

  useEffect(() => { if (residentIdFilter) setFormResidentId(residentIdFilter); }, [residentIdFilter]);

  const isResidentScope = Boolean(residentIdFilter);

  const visibleTasks = useMemo(() => {
    let list = tasks;
    if (residentIdFilter) { list = list.filter(t => t.residentId === residentIdFilter); }
    else { const td = startOfDay(today).getTime(); list = list.filter(t => startOfDay(t.deadline).getTime() <= td); }
    return list;
  }, [tasks, today, residentIdFilter]);

  const sortedTasks = useMemo(() => {
    const open = visibleTasks.filter(t => t.status !== 'afsluttet');
    const done = visibleTasks.filter(t => t.status === 'afsluttet');
    const byDl = (a: CareTask, b: CareTask) => a.deadline.getTime() - b.deadline.getTime();
    return [...open.sort(byDl), ...done.sort(byDl)];
  }, [visibleTasks]);

  const setStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }, []);

  const submitTask = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const rid = residentIdFilter ?? formResidentId;
    if (!rid || !formTitle.trim() || !formDeadline || !formAssignee.trim()) return;
    const res = RESIDENTS.find(r => r.id === rid);
    if (!res) return;
    const [y, m, d] = formDeadline.split('-').map(Number);
    setTasks(prev => [...prev, {
      id: `tsk-${Date.now()}`, residentId: res.id, residentName: res.name, initials: res.initials,
      title: formTitle.trim(), deadline: new Date(y!, m! - 1, d!, 12, 0, 0, 0),
      assignedTo: formAssignee.trim().toUpperCase().slice(0, 6), status: 'åben', priority: formPriority,
    }]);
    setFormTitle(''); setFormPriority('mellem'); setFormAssignee('SK');
    setFormDeadline(toDateInputValue(today));
    if (!residentIdFilter) setFormResidentId('');
    setShowForm(false);
  }, [residentIdFilter, formResidentId, formTitle, formDeadline, formAssignee, formPriority, today]);

  if (!hydrated) {
    return (
      <div className="w-full rounded-xl p-5 animate-pulse" style={{ backgroundColor: 'var(--cp-bg2)', border: '1px solid var(--cp-border)' }}>
        <div className="mb-4 flex justify-between">
          <div className="h-8 w-40 rounded-lg" style={{ backgroundColor: 'var(--cp-bg3)' }} />
          <div className="h-8 w-20 rounded-lg" style={{ backgroundColor: 'var(--cp-bg3)' }} />
        </div>
        <div className="h-20 rounded-xl" style={{ backgroundColor: 'var(--cp-bg3)' }} />
      </div>
    );
  }

  return (
    <section
      className="w-full rounded-xl p-5"
      style={{ backgroundColor: 'var(--cp-bg2)', border: '1px solid var(--cp-border)' }}
      aria-label="Opgaver"
    >
      <div className="mb-4 flex items-start justify-between gap-3 pb-4" style={{ borderBottom: '1px solid var(--cp-border)' }}>
        <div className="flex min-w-0 items-start gap-2.5">
          <CheckSquare className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--cp-blue)' }} aria-hidden />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>Opgaver</h2>
            <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              {isResidentScope ? 'Opgaver for denne beboer' : 'Forfaldne og dagens opgaver'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(s => !s)}
          aria-expanded={showForm}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:opacity-90"
          style={{ backgroundColor: 'var(--cp-green)' }}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Tilføj
        </button>
      </div>

      <div className={`grid transition-all duration-200 ease-out ${showForm ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="min-h-0 overflow-hidden">
          <form onSubmit={submitTask} className="mb-4 space-y-3 rounded-xl p-4" style={{ backgroundColor: 'var(--cp-bg3)', border: '1px solid var(--cp-border)' }}>
            {!residentIdFilter && (
              <div>
                <label htmlFor="opg-res" className="mb-1 block text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>Beboer</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--cp-muted2)' }} />
                  <select id="opg-res" value={formResidentId} onChange={e => setFormResidentId(e.target.value)} required style={{ ...INPUT_STYLE, paddingLeft: '2.25rem', paddingRight: '2rem', appearance: 'none' }}>
                    <option value="">Vælg beboer</option>
                    {RESIDENTS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--cp-muted2)' }} />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="opg-title" className="mb-1 block text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>Opgave</label>
              <input id="opg-title" value={formTitle} onChange={e => setFormTitle(e.target.value)} required style={INPUT_STYLE} placeholder="Kort beskrivelse…" />
            </div>
            <div>
              <label htmlFor="opg-deadline" className="mb-1 block text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>Deadline</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--cp-muted2)' }} />
                <input id="opg-deadline" type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} required style={{ ...INPUT_STYLE, paddingLeft: '2.25rem' }} />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>Prioritet</p>
              <div className="flex flex-wrap gap-2">
                {(['lav','mellem','høj'] as TaskPriority[]).map(p => (
                  <button key={p} type="button" onClick={() => setFormPriority(p)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-all duration-200"
                    style={formPriority === p
                      ? { backgroundColor: 'var(--cp-green)', color: '#fff' }
                      : { backgroundColor: 'var(--cp-bg3)', border: '1px solid var(--cp-border2)', color: 'var(--cp-muted)' }
                    }
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="opg-asg" className="mb-1 block text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>Ansvarlig</label>
              <input id="opg-asg" value={formAssignee} onChange={e => setFormAssignee(e.target.value)} placeholder="Initialer, fx SK" style={{ ...INPUT_STYLE, fontFamily: 'monospace' }} />
            </div>
            <button type="submit" className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90" style={{ backgroundColor: 'var(--cp-green)' }}>
              Gem opgave
            </button>
          </form>
        </div>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="mb-2 h-8 w-8" style={{ color: 'var(--cp-green)' }} aria-hidden />
          <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>Ingen forfaldne opgaver</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sortedTasks.map(t => {
            const done = t.status === 'afsluttet';
            const when = deadlineDayLabel(t.deadline, today);
            return (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-xl p-3 transition-all duration-200"
                style={{ backgroundColor: 'var(--cp-bg3)', border: '1px solid var(--cp-border)', opacity: done ? 0.5 : 1 }}
              >
                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={priorityDotStyle(t.priority)} aria-hidden />
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: 'var(--cp-blue)' }}>
                    {t.initials}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)', textDecoration: done ? 'line-through' : 'none' }}>
                    {t.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--cp-muted2)' }}>{t.residentName}</p>
                  <div className="mt-2">
                    {when === 'overdue' ? (
                      <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' }}>
                        Forfaldt {formatDanishShortDate(t.deadline)}
                      </span>
                    ) : when === 'today' ? (
                      <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--cp-amber-dim)', color: 'var(--cp-amber)' }}>
                        I dag
                      </span>
                    ) : (
                      <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--cp-bg2)', color: 'var(--cp-muted)' }}>
                        {formatDanishShortDate(t.deadline)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  <span className="rounded-md px-2 py-1 font-mono text-xs font-medium" style={{ backgroundColor: 'var(--cp-bg2)', color: 'var(--cp-muted)' }}>
                    {t.assignedTo}
                  </span>
                  <div className="relative">
                    <select
                      value={t.status}
                      onChange={e => setStatus(t.id, e.target.value as TaskStatus)}
                      aria-label={`Status for ${t.title}`}
                      style={{
                        appearance: 'none', backgroundColor: 'var(--cp-bg2)', border: '1px solid var(--cp-border2)',
                        color: 'var(--cp-text)', borderRadius: 9999, padding: '0.375rem 2rem 0.375rem 0.625rem',
                        fontSize: '0.75rem', fontWeight: 500, outline: 'none', colorScheme: 'dark',
                      }}
                    >
                      <option value="åben">Åben</option>
                      <option value="igangsat">Igangsat</option>
                      <option value="afsluttet">Afsluttet</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2" style={{ color: 'var(--cp-muted2)' }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

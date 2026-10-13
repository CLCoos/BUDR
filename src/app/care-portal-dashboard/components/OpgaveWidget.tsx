'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Loader2,
  Plus,
  RefreshCw,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';
import { copenhagenYmd } from '@/lib/copenhagenDay';
import { isValidUuid } from '@/lib/uuid';
import { getInitials } from '@/lib/residents/formatName';
import {
  buildStaffTaskInsertRow,
  canSaveStaffTask,
  deadlineDayLabelFromYmd,
  deadlineYmdToDate,
  initialsFromDisplayName,
  isDeadlineOnOrBefore,
  isTaskStatus,
  normalizeAssignee,
  parseStaffTaskRow,
  type TaskPriority,
  type TaskStatus,
} from '@/lib/staffTasks';

export type { TaskStatus, TaskPriority };

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

type ResidentOption = { id: string; name: string; initials: string };

const DEMO_RESIDENTS: ResidentOption[] = [
  { id: 'res-sara', name: 'Sara K.', initials: 'SK' },
  { id: 'res-mikkel', name: 'Mikkel T.', initials: 'MT' },
  { id: 'res-anders', name: 'Anders P.', initials: 'AP' },
  { id: 'res-mette', name: 'Mette P.', initials: 'MP' },
  { id: 'res-camilla', name: 'Camilla B.', initials: 'CB' },
  { id: 'res-jonas', name: 'Jonas F.', initials: 'JF' },
];

function formatDanishShortDate(d: Date): string {
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function priorityDotStyle(p: TaskPriority): React.CSSProperties {
  if (p === 'høj') return { backgroundColor: 'var(--cp-red)' };
  if (p === 'mellem') return { backgroundColor: 'var(--cp-amber)' };
  return { backgroundColor: 'var(--cp-muted2)' };
}

function createDemoTasks(ref: Date): CareTask[] {
  const yesterday = new Date(ref);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow2 = new Date(ref);
  tomorrow2.setDate(tomorrow2.getDate() + 2);
  const t0 = deadlineYmdToDate(copenhagenYmd(ref));
  const t1 = new Date(t0);
  t1.setUTCHours(14, 0, 0, 0);
  return [
    {
      id: 'tsk-d1',
      residentId: 'res-sara',
      residentName: 'Sara K.',
      initials: 'SK',
      title: 'Daglig kontakt og søvnscreening — rød status',
      deadline: t0,
      assignedTo: 'LN',
      status: 'åben',
      priority: 'høj',
    },
    {
      id: 'tsk-d2',
      residentId: 'res-sara',
      residentName: 'Sara K.',
      initials: 'SK',
      title: 'Repetér tryghedsplan med Sara efter natlig uro',
      deadline: t1,
      assignedTo: 'LN',
      status: 'åben',
      priority: 'høj',
    },
    {
      id: 'tsk-d3',
      residentId: 'res-camilla',
      residentName: 'Camilla B.',
      initials: 'CB',
      title: 'Rolig opfølgning i morgen formiddag',
      deadline: t0,
      assignedTo: 'LN',
      status: 'igangsat',
      priority: 'mellem',
    },
    {
      id: 'tsk-d4',
      residentId: 'res-mikkel',
      residentName: 'Mikkel T.',
      initials: 'MT',
      title: 'Ugentlig opfølgning med behandler',
      deadline: deadlineYmdToDate(copenhagenYmd(yesterday)),
      assignedTo: 'LN',
      status: 'åben',
      priority: 'mellem',
    },
    {
      id: 'tsk-d5',
      residentId: 'res-jonas',
      residentName: 'Jonas F.',
      initials: 'JF',
      title: 'Ugentlig evaluering af tilpasning (nyindflyttet)',
      deadline: deadlineYmdToDate(copenhagenYmd(tomorrow2)),
      assignedTo: 'LN',
      status: 'åben',
      priority: 'lav',
    },
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

type OpgaveWidgetProps = {
  residentIdFilter?: string | null;
  /** Salgsdemo / pilot-sim: Sara-universets opgaver. Default false = live Supabase. */
  demoMode?: boolean;
};

async function staffAuthorLabel(): Promise<string> {
  const supabase = createClient();
  if (!supabase) return '';
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return '';
  const meta = user.user_metadata as { full_name?: string; initials?: string } | undefined;
  if (typeof meta?.initials === 'string' && meta.initials.trim())
    return normalizeAssignee(meta.initials);
  if (typeof meta?.full_name === 'string' && meta.full_name.trim()) {
    return initialsFromDisplayName(meta.full_name);
  }
  const email = user.email?.split('@')[0] ?? '';
  return normalizeAssignee(email) || '?';
}

export default function OpgaveWidget({
  residentIdFilter = null,
  demoMode = false,
}: OpgaveWidgetProps) {
  const [hydrated, setHydrated] = useState(demoMode);
  const [today, setToday] = useState(() => new Date());
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [liveResidents, setLiveResidents] = useState<ResidentOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formResidentId, setFormResidentId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formPriority, setFormPriority] = useState<TaskPriority>('mellem');
  const [formAssignee, setFormAssignee] = useState(demoMode ? 'SK' : '');
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const residentOptions = demoMode ? DEMO_RESIDENTS : liveResidents;

  const demoTasksSeed = useMemo(() => {
    const now = new Date();
    return { today: now, tasks: createDemoTasks(now), deadline: copenhagenYmd(now) };
  }, []);

  const loadLive = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setScopeError('Kunne ikke oprette forbindelse');
      setTasks([]);
      setLiveResidents([]);
      setHydrated(true);
      setRefreshing(false);
      return;
    }

    const {
      orgId,
      residentIds,
      error: orgErr,
      queryMessage,
    } = await resolveStaffOrgResidents(supabase);
    if (orgErr || !orgId) {
      setScopeError(
        orgErr === 'no_org'
          ? 'Organisation mangler på din bruger — kontakt administrator'
          : orgErr === 'no_session'
            ? 'Log ind for at se opgaver'
            : orgErr === 'no_client'
              ? 'Kunne ikke oprette forbindelse'
              : (queryMessage ?? 'Kunne ikke hente beboere')
      );
      setTasks([]);
      setLiveResidents([]);
      setHydrated(true);
      setRefreshing(false);
      return;
    }

    if (residentIds.length === 0) {
      setScopeError(null);
      setTasks([]);
      setLiveResidents([]);
      setHydrated(true);
      setRefreshing(false);
      return;
    }

    const { data: resRows, error: resErr } = await supabase
      .from('care_residents')
      .select('user_id, display_name, first_name, last_name')
      .eq('org_id', orgId)
      .order('display_name');

    if (resErr) {
      setScopeError(resErr.message);
      setTasks([]);
      setLiveResidents([]);
      setHydrated(true);
      setRefreshing(false);
      return;
    }

    const resList = (resRows ?? []) as {
      user_id: string;
      display_name: string;
      first_name: string | null;
      last_name: string | null;
    }[];
    const options: ResidentOption[] = resList.map((r) => ({
      id: r.user_id,
      name: r.display_name,
      initials: getInitials(r),
    }));
    setLiveResidents(options);

    let query = supabase
      .from('care_staff_tasks')
      .select('id, resident_id, title, deadline, assigned_to, status, priority, created_at')
      .eq('org_id', orgId)
      .in('resident_id', residentIds)
      .order('deadline', { ascending: true })
      .limit(200);

    if (residentIdFilter && isValidUuid(residentIdFilter)) {
      query = query.eq('resident_id', residentIdFilter);
    }

    const { data: taskRows, error: tErr } = await query;

    if (tErr) {
      setScopeError(
        tErr.message.includes('care_staff_tasks')
          ? `${tErr.message} — kør seneste Supabase-migration (care_staff_tasks).`
          : tErr.message
      );
      setTasks([]);
    } else {
      setScopeError(null);
      const nameBy = Object.fromEntries(options.map((r) => [r.id, r.name]));
      const initialsBy = Object.fromEntries(options.map((r) => [r.id, r.initials]));
      const mapped: CareTask[] = (taskRows ?? [])
        .map((row) => parseStaffTaskRow((row ?? {}) as Record<string, unknown>))
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .map((row) => ({
          id: row.id,
          residentId: row.resident_id,
          residentName: nameBy[row.resident_id] ?? 'Beboer',
          initials:
            initialsBy[row.resident_id] ?? initialsFromDisplayName(nameBy[row.resident_id] ?? ''),
          title: row.title,
          deadline: deadlineYmdToDate(row.deadline),
          assignedTo: row.assigned_to || '—',
          status: row.status,
          priority: row.priority,
        }));
      setTasks(mapped);
    }

    const now = new Date();
    setToday(now);
    setFormDeadline((prev) => prev || copenhagenYmd(now));
    setHydrated(true);
    setRefreshing(false);
  }, [residentIdFilter]);

  useEffect(() => {
    if (!demoMode) return;
    setToday((prev) => (prev === demoTasksSeed.today ? prev : demoTasksSeed.today));
    setTasks((prev) => (prev === demoTasksSeed.tasks ? prev : demoTasksSeed.tasks));
    setFormDeadline((prev) => (prev === demoTasksSeed.deadline ? prev : demoTasksSeed.deadline));
    setHydrated((h) => (h ? h : true));
  }, [demoMode, demoTasksSeed]);

  useEffect(() => {
    if (demoMode) return;
    void loadLive();
  }, [demoMode, loadLive]);

  useEffect(() => {
    if (residentIdFilter) setFormResidentId(residentIdFilter);
  }, [residentIdFilter]);

  const refresh = useCallback(() => {
    if (demoMode) return;
    setRefreshing(true);
    void loadLive();
  }, [demoMode, loadLive]);

  const isResidentScope = Boolean(residentIdFilter);
  const todayYmd = copenhagenYmd(today);

  const visibleTasks = useMemo(() => {
    let list = tasks;
    if (residentIdFilter) {
      list = list.filter((t) => t.residentId === residentIdFilter);
    } else {
      list = list.filter((t) => isDeadlineOnOrBefore(copenhagenYmd(t.deadline), todayYmd));
    }
    return list;
  }, [tasks, todayYmd, residentIdFilter]);

  const sortedTasks = useMemo(() => {
    const open = visibleTasks.filter((t) => t.status !== 'afsluttet');
    const done = visibleTasks.filter((t) => t.status === 'afsluttet');
    const byDl = (a: CareTask, b: CareTask) => a.deadline.getTime() - b.deadline.getTime();
    return [...open.sort(byDl), ...done.sort(byDl)];
  }, [visibleTasks]);

  const setStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      if (demoMode) {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
        return;
      }
      const supabase = createClient();
      if (!supabase) {
        toast.error('Ingen forbindelse');
        return;
      }
      const previous = tasks.find((t) => t.id === id)?.status;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      setStatusUpdatingId(id);
      const { error } = await supabase
        .from('care_staff_tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      setStatusUpdatingId(null);
      if (error) {
        if (previous) {
          setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: previous } : t)));
        }
        toast.error('Kunne ikke opdatere status');
        return;
      }
    },
    [demoMode, tasks]
  );

  const submitTask = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const rid = residentIdFilter ?? formResidentId;
      if (
        !canSaveStaffTask({
          residentId: rid,
          title: formTitle,
          deadlineYmd: formDeadline,
          assignedTo: formAssignee,
          priority: formPriority,
        })
      ) {
        return;
      }
      const res = residentOptions.find((r) => r.id === rid);
      if (!res) return;

      if (demoMode) {
        const [y, m, d] = formDeadline.split('-').map(Number);
        setTasks((prev) => [
          ...prev,
          {
            id: `tsk-${Date.now()}`,
            residentId: res.id,
            residentName: res.name,
            initials: res.initials,
            title: formTitle.trim(),
            deadline: new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0)),
            assignedTo: normalizeAssignee(formAssignee),
            status: 'åben',
            priority: formPriority,
          },
        ]);
        setFormTitle('');
        setFormPriority('mellem');
        setFormAssignee('SK');
        setFormDeadline(copenhagenYmd(today));
        if (!residentIdFilter) setFormResidentId('');
        setShowForm(false);
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        toast.error('Ingen forbindelse');
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error('Du skal være logget ind');
        return;
      }
      if (!isValidUuid(res.id)) {
        toast.error('Ugyldig beboer');
        return;
      }

      setSaving(true);
      const { data: staffOrgRow } = await supabase
        .from('care_staff')
        .select('org_id')
        .eq('id', user.id)
        .maybeSingle();
      const orgId = (staffOrgRow as { org_id?: string } | null)?.org_id ?? null;
      if (!orgId) {
        setSaving(false);
        toast.error('Organisation mangler på din bruger');
        return;
      }

      const author = formAssignee.trim()
        ? normalizeAssignee(formAssignee)
        : await staffAuthorLabel();
      const { error } = await supabase.from('care_staff_tasks').insert(
        buildStaffTaskInsertRow({
          orgId,
          createdBy: user.id,
          residentId: res.id,
          title: formTitle,
          deadlineYmd: formDeadline,
          assignedTo: author,
          priority: formPriority,
        })
      );
      setSaving(false);
      if (error) {
        toast.error(
          error.message.includes('care_staff_tasks')
            ? 'Databasen mangler tabellen — kør migration care_staff_tasks'
            : 'Kunne ikke gemme opgave'
        );
        return;
      }
      toast.success('Opgave gemt');
      setFormTitle('');
      setFormPriority('mellem');
      setFormAssignee(author);
      setFormDeadline(copenhagenYmd(today));
      if (!residentIdFilter) setFormResidentId('');
      setShowForm(false);
      void loadLive();
    },
    [
      residentIdFilter,
      formResidentId,
      formTitle,
      formDeadline,
      formAssignee,
      formPriority,
      today,
      residentOptions,
      demoMode,
      loadLive,
    ]
  );

  if (!hydrated) {
    return (
      <div className="cp-card-elevated w-full animate-pulse p-5">
        <div className="mb-4 flex justify-between">
          <div className="h-8 w-40 rounded-lg" style={{ backgroundColor: 'var(--cp-bg3)' }} />
          <div className="h-8 w-20 rounded-lg" style={{ backgroundColor: 'var(--cp-bg3)' }} />
        </div>
        <div className="h-20 rounded-xl" style={{ backgroundColor: 'var(--cp-bg3)' }} />
      </div>
    );
  }

  return (
    <section className="cp-card-elevated w-full p-5" aria-label="Opgaver">
      <div
        className="mb-4 flex items-start justify-between gap-3 pb-4"
        style={{ borderBottom: '1px solid var(--cp-border)' }}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <CheckSquare
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: 'var(--cp-blue)' }}
            aria-hidden
          />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
              Opgaver
            </h2>
            <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              {isResidentScope ? 'Opgaver for denne beboer' : 'Forfaldne og dagens opgaver'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!demoMode && (
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                borderColor: 'var(--cp-border)',
                color: 'var(--cp-muted)',
                backgroundColor: 'transparent',
              }}
              aria-label="Opdater liste"
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            aria-expanded={showForm}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: 'var(--cp-green)' }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Tilføj
          </button>
        </div>
      </div>

      <div
        className={`grid transition-all duration-200 ease-out ${showForm ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <form
            onSubmit={submitTask}
            className="mb-4 space-y-3 rounded-xl p-4"
            style={{ backgroundColor: 'var(--cp-bg3)', border: '1px solid var(--cp-border)' }}
          >
            {!residentIdFilter && (
              <div>
                <label
                  htmlFor="opg-res"
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--cp-muted)' }}
                >
                  Beboer
                </label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: 'var(--cp-muted2)' }}
                  />
                  <select
                    id="opg-res"
                    value={formResidentId}
                    onChange={(e) => setFormResidentId(e.target.value)}
                    required
                    style={{
                      ...INPUT_STYLE,
                      paddingLeft: '2.25rem',
                      paddingRight: '2rem',
                      appearance: 'none',
                    }}
                  >
                    <option value="">Vælg beboer</option>
                    {residentOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: 'var(--cp-muted2)' }}
                  />
                </div>
              </div>
            )}
            <div>
              <label
                htmlFor="opg-title"
                className="mb-1 block text-xs font-medium"
                style={{ color: 'var(--cp-muted)' }}
              >
                Opgave
              </label>
              <input
                id="opg-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                style={INPUT_STYLE}
                placeholder="Kort beskrivelse…"
              />
            </div>
            <div>
              <label
                htmlFor="opg-deadline"
                className="mb-1 block text-xs font-medium"
                style={{ color: 'var(--cp-muted)' }}
              >
                Deadline
              </label>
              <div className="relative">
                <Calendar
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: 'var(--cp-muted2)' }}
                />
                <input
                  id="opg-deadline"
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  required
                  style={{ ...INPUT_STYLE, paddingLeft: '2.25rem' }}
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>
                Prioritet
              </p>
              <div className="flex flex-wrap gap-2">
                {(['lav', 'mellem', 'høj'] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormPriority(p)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-all duration-200"
                    style={
                      formPriority === p
                        ? { backgroundColor: 'var(--cp-green)', color: '#fff' }
                        : {
                            backgroundColor: 'var(--cp-bg3)',
                            border: '1px solid var(--cp-border2)',
                            color: 'var(--cp-muted)',
                          }
                    }
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label
                htmlFor="opg-asg"
                className="mb-1 block text-xs font-medium"
                style={{ color: 'var(--cp-muted)' }}
              >
                Ansvarlig
              </label>
              <input
                id="opg-asg"
                value={formAssignee}
                onChange={(e) => setFormAssignee(e.target.value)}
                placeholder="Initialer, fx SK"
                style={{ ...INPUT_STYLE, fontFamily: 'monospace' }}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: 'var(--cp-green)' }}
            >
              {saving ? 'Gemmer…' : 'Gem opgave'}
            </button>
          </form>
        </div>
      </div>

      {scopeError ? (
        <p className="py-4 text-sm" style={{ color: 'var(--cp-amber)' }}>
          {scopeError}
        </p>
      ) : sortedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="mb-2 h-8 w-8" style={{ color: 'var(--cp-green)' }} aria-hidden />
          <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
            Ingen forfaldne opgaver
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sortedTasks.map((t) => {
            const done = t.status === 'afsluttet';
            const when = deadlineDayLabelFromYmd(copenhagenYmd(t.deadline), todayYmd);
            return (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-xl p-3 transition-all duration-200"
                style={{
                  backgroundColor: 'var(--cp-bg3)',
                  border: '1px solid var(--cp-border)',
                  opacity: done ? 0.5 : 1,
                }}
              >
                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={priorityDotStyle(t.priority)}
                    aria-hidden
                  />
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                    style={{ backgroundColor: 'var(--cp-blue)' }}
                  >
                    {t.initials}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color: 'var(--cp-text)',
                      textDecoration: done ? 'line-through' : 'none',
                    }}
                  >
                    {t.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                    {t.residentName}
                  </p>
                  <div className="mt-2">
                    {when === 'overdue' ? (
                      <span
                        className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' }}
                      >
                        Forfaldt {formatDanishShortDate(t.deadline)}
                      </span>
                    ) : when === 'today' ? (
                      <span
                        className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: 'var(--cp-amber-dim)', color: 'var(--cp-amber)' }}
                      >
                        I dag
                      </span>
                    ) : (
                      <span
                        className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: 'var(--cp-bg2)', color: 'var(--cp-muted)' }}
                      >
                        {formatDanishShortDate(t.deadline)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  <span
                    className="rounded-md px-2 py-1 font-mono text-xs font-medium"
                    style={{ backgroundColor: 'var(--cp-bg2)', color: 'var(--cp-muted)' }}
                  >
                    {t.assignedTo}
                  </span>
                  <div className="relative">
                    <select
                      value={t.status}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (isTaskStatus(next)) void setStatus(t.id, next);
                      }}
                      disabled={statusUpdatingId === t.id}
                      aria-label={`Status for ${t.title}`}
                      style={{
                        appearance: 'none',
                        backgroundColor: 'var(--cp-bg2)',
                        border: '1px solid var(--cp-border2)',
                        color: 'var(--cp-text)',
                        borderRadius: 9999,
                        padding: '0.375rem 2rem 0.375rem 0.625rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        outline: 'none',
                        colorScheme: 'dark',
                      }}
                    >
                      <option value="åben">Åben</option>
                      <option value="igangsat">Igangsat</option>
                      <option value="afsluttet">Afsluttet</option>
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2"
                      style={{ color: 'var(--cp-muted2)' }}
                    />
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

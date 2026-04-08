'use client';
import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Target, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface GoalStep {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
}

interface Goal {
  id: string;
  title: string;
  createdBy: string;
  createdAt: string;
  steps: GoalStep[];
}

const mockGoals: Goal[] = [
  {
    id: 'gp-001',
    title: 'Komme ud af huset dagligt',
    createdBy: 'Sara K.',
    createdAt: '15/03/2026',
    steps: [
      {
        id: 'gps-001-1',
        text: 'Gå til postkassen en gang om dagen',
        completed: true,
        completedAt: '24/03/2026',
      },
      {
        id: 'gps-001-2',
        text: 'Tag en 5 minutters tur rundt om bygningen',
        completed: true,
        completedAt: '25/03/2026',
      },
      { id: 'gps-001-3', text: 'Gå til det lokale bageri og køb en bolle', completed: false },
      { id: 'gps-001-4', text: 'Tag offentlig transport til centeret', completed: false },
      { id: 'gps-001-5', text: 'Deltag i et gruppearrangement udenfor bostedet', completed: false },
    ],
  },
  {
    id: 'gp-002',
    title: 'Forbedre søvnrytme',
    createdBy: 'Morten L.',
    createdAt: '10/03/2026',
    steps: [
      {
        id: 'gps-002-1',
        text: 'Sluk skærm 30 min før sengetid',
        completed: true,
        completedAt: '23/03/2026',
      },
      { id: 'gps-002-2', text: 'Gå i seng senest kl. 23:00 tre dage i træk', completed: false },
      { id: 'gps-002-3', text: 'Stå op kl. 08:00 uden alarm en hel uge', completed: false },
    ],
  },
  {
    id: 'gp-003',
    title: 'Deltage i fællesaktiviteter',
    createdBy: 'Sara K.',
    createdAt: '20/03/2026',
    steps: [
      {
        id: 'gps-003-1',
        text: 'Sidde med ved fællesspisning én gang',
        completed: true,
        completedAt: '22/03/2026',
      },
      { id: 'gps-003-2', text: 'Deltage i en planlagt aktivitet på bostedet', completed: false },
      { id: 'gps-003-3', text: 'Invitere en medborger til kaffe', completed: false },
    ],
  },
];

function formatDaDate(iso: string) {
  return new Date(iso).toLocaleDateString('da-DK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface Props {
  compact?: boolean;
  variant?: 'mock' | 'live';
  residentId?: string;
  /** Mørke kort som live Care Portal / demo */
  carePortalDark?: boolean;
}

export default function GoalProgress({
  compact,
  variant = 'mock',
  residentId,
  carePortalDark,
}: Props) {
  const d = carePortalDark === true;
  const accent = d ? 'var(--cp-green)' : '#1D9E75';
  const [goals, setGoals] = useState<Goal[]>(() => (variant === 'mock' ? mockGoals : []));
  const [loading, setLoading] = useState(variant === 'live');
  const [expanded, setExpanded] = useState<string>(() =>
    variant === 'mock' ? (mockGoals[0]?.id ?? '') : ''
  );

  useEffect(() => {
    if (variant === 'mock') {
      setGoals(mockGoals);
      setLoading(false);
      setExpanded(mockGoals[0]?.id ?? '');
      return;
    }

    if (!residentId?.trim()) {
      setGoals([]);
      setLoading(false);
      setExpanded('');
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) {
          setGoals([]);
          setLoading(false);
        }
        return;
      }

      const { data: goalRows, error: gErr } = await supabase
        .from('park_goals')
        .select('id, title, created_at, status')
        .eq('resident_id', residentId.trim())
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8);

      if (cancelled) return;

      if (gErr || !goalRows?.length) {
        setGoals([]);
        setLoading(false);
        setExpanded('');
        return;
      }

      const goalIds = goalRows.map((g) => g.id as string);
      const { data: stepRows, error: sErr } = await supabase
        .from('park_goal_steps')
        .select('id, goal_id, step_number, title, completed, completed_at')
        .in('goal_id', goalIds)
        .order('step_number');

      if (cancelled) return;

      const stepsByGoal = new Map<string, NonNullable<typeof stepRows>>();
      if (!sErr && stepRows) {
        for (const s of stepRows) {
          const gid = s.goal_id as string;
          const arr = stepsByGoal.get(gid) ?? [];
          arr.push(s);
          stepsByGoal.set(gid, arr);
        }
      }

      const mapped: Goal[] = goalRows.map((g) => {
        const steps = stepsByGoal.get(g.id as string) ?? [];
        const sorted = [...steps].sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0));
        return {
          id: g.id as string,
          title: (g.title as string) ?? '—',
          createdBy: '—',
          createdAt: formatDaDate(g.created_at as string),
          steps: sorted.map((s) => ({
            id: s.id as string,
            text: (s.title as string) ?? '',
            completed: !!s.completed,
            completedAt: s.completed_at ? formatDaDate(s.completed_at as string) : undefined,
          })),
        };
      });

      if (!cancelled) {
        setGoals(mapped);
        setExpanded(mapped[0]?.id ?? '');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [variant, residentId]);

  const getProgress = (goal: Goal) => {
    const total = goal.steps.length;
    const done = goal.steps.filter((s) => s.completed).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { done, total, pct };
  };

  if (variant === 'live' && loading) {
    return (
      <div
        className={`overflow-hidden rounded-xl border ${d ? '' : 'rounded-lg border-gray-100 bg-white'}`}
        style={
          d ? { backgroundColor: 'var(--cp-bg2)', borderColor: 'var(--cp-border)' } : undefined
        }
      >
        <div
          className={`flex items-center gap-2 border-b px-4 py-3 ${d ? '' : 'border-gray-100'}`}
          style={d ? { borderColor: 'var(--cp-border)' } : undefined}
        >
          <Target size={15} style={{ color: accent }} />
          <span
            className={`text-sm font-semibold ${d ? '' : 'text-gray-800'}`}
            style={d ? { color: 'var(--cp-text)' } : undefined}
          >
            Mål
          </span>
        </div>
        <div
          className={`px-4 py-6 text-center text-xs ${d ? '' : 'text-gray-400'}`}
          style={d ? { color: 'var(--cp-muted)' } : undefined}
        >
          Henter mål…
        </div>
      </div>
    );
  }

  if (variant === 'live' && goals.length === 0) {
    return (
      <div
        className={`overflow-hidden rounded-xl border ${d ? '' : 'rounded-lg border-gray-100 bg-white'}`}
        style={
          d ? { backgroundColor: 'var(--cp-bg2)', borderColor: 'var(--cp-border)' } : undefined
        }
      >
        <div
          className={`flex items-center gap-2 border-b px-4 py-3 ${d ? '' : 'border-gray-100'}`}
          style={d ? { borderColor: 'var(--cp-border)' } : undefined}
        >
          <Target size={15} style={{ color: accent }} />
          <span
            className={`text-sm font-semibold ${d ? '' : 'text-gray-800'}`}
            style={d ? { color: 'var(--cp-text)' } : undefined}
          >
            Mål
          </span>
        </div>
        <div
          className={`px-4 py-6 text-center text-xs ${d ? '' : 'text-gray-400'}`}
          style={d ? { color: 'var(--cp-muted)' } : undefined}
        >
          Ingen aktive mål
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border ${d ? '' : 'rounded-lg border-gray-100 bg-white'}`}
      style={d ? { backgroundColor: 'var(--cp-bg2)', borderColor: 'var(--cp-border)' } : undefined}
    >
      <div
        className={`flex items-center justify-between border-b px-4 py-3 ${d ? '' : 'border-gray-100'}`}
        style={d ? { borderColor: 'var(--cp-border)' } : undefined}
      >
        <div className="flex items-center gap-2">
          <Target size={15} style={{ color: accent }} />
          <span
            className={`text-sm font-semibold ${d ? '' : 'text-gray-800'}`}
            style={d ? { color: 'var(--cp-text)' } : undefined}
          >
            Mål
          </span>
          <span
            className={`text-xs ${d ? '' : 'text-gray-400'}`}
            style={d ? { color: 'var(--cp-muted)' } : undefined}
          >
            {goals.length} aktive
          </span>
        </div>
        {!compact && variant === 'mock' && (
          <button
            type="button"
            className={`flex items-center gap-1 text-xs hover:underline ${d ? '' : 'text-[#1D9E75]'}`}
            style={d ? { color: 'var(--cp-green)' } : undefined}
          >
            <Plus size={12} /> Tilføj mål
          </button>
        )}
      </div>

      <div
        className={
          compact ? '' : d ? 'divide-y divide-[var(--cp-border)]' : 'divide-y divide-gray-50'
        }
      >
        {goals.map((goal) => {
          const { done, total, pct } = getProgress(goal);
          const isExpanded = !compact && expanded === goal.id;

          return (
            <div key={goal.id}>
              <button
                type="button"
                onClick={() => !compact && setExpanded(isExpanded ? '' : goal.id)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  !compact && !d ? 'hover:bg-gray-50' : ''
                } ${!compact && d ? 'hover:bg-white/[0.04]' : ''}`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div
                    className={`text-sm font-medium leading-snug ${d ? '' : 'text-gray-800'}`}
                    style={d ? { color: 'var(--cp-text)' } : undefined}
                  >
                    {goal.title}
                  </div>
                  <span
                    className="flex-shrink-0 text-xs font-bold tabular-nums"
                    style={{ color: accent }}
                  >
                    {pct}%
                  </span>
                </div>
                <div
                  className={`mb-1.5 h-1.5 overflow-hidden rounded-full ${d ? '' : 'bg-gray-100'}`}
                  style={d ? { backgroundColor: 'var(--cp-bg3)' } : undefined}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: accent }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div
                    className={`text-xs ${d ? '' : 'text-gray-400'}`}
                    style={d ? { color: 'var(--cp-muted)' } : undefined}
                  >
                    {done}/{total} trin{goal.createdBy !== '—' ? ` · ${goal.createdBy}` : ''}
                  </div>
                  <div
                    className={`text-xs ${d ? '' : 'text-gray-400'}`}
                    style={d ? { color: 'var(--cp-muted)' } : undefined}
                  >
                    {goal.createdAt}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div
                  className={`border-t px-4 pb-4 ${d ? '' : 'border-gray-50'}`}
                  style={d ? { borderColor: 'var(--cp-border)' } : undefined}
                >
                  <div className="relative pt-2">
                    <div
                      className={`absolute bottom-2 left-3 top-4 w-0.5 ${d ? '' : 'bg-gray-100'}`}
                      style={d ? { backgroundColor: 'var(--cp-border)' } : undefined}
                    />
                    <div className="space-y-2.5">
                      {goal.steps.map((step, idx) => {
                        const isLocked = idx > 0 && !goal.steps[idx - 1].completed;
                        return (
                          <div key={step.id} className="flex items-start gap-3 relative">
                            <div
                              className={`z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                                step.completed
                                  ? ''
                                  : isLocked
                                    ? d
                                      ? ''
                                      : 'bg-gray-100'
                                    : d
                                      ? 'border-2'
                                      : 'border-2 border-[#1D9E75]/40 bg-white'
                              }`}
                              style={
                                step.completed
                                  ? { backgroundColor: accent }
                                  : isLocked
                                    ? d
                                      ? { backgroundColor: 'var(--cp-bg3)' }
                                      : undefined
                                    : d
                                      ? {
                                          borderColor: 'rgba(45,212,160,0.45)',
                                          backgroundColor: 'var(--cp-bg2)',
                                        }
                                      : undefined
                              }
                            >
                              {step.completed ? (
                                <CheckCircle2 size={12} className="text-white" />
                              ) : (
                                <Circle
                                  size={12}
                                  className={
                                    isLocked
                                      ? d
                                        ? 'text-[var(--cp-muted2)]'
                                        : 'text-gray-300'
                                      : d
                                        ? ''
                                        : 'text-[#1D9E75]/40'
                                  }
                                  style={
                                    !isLocked && d ? { color: 'rgba(45,212,160,0.5)' } : undefined
                                  }
                                />
                              )}
                            </div>
                            <div className={`flex-1 pt-0.5 ${isLocked ? 'opacity-40' : ''}`}>
                              <div
                                className={`text-xs ${
                                  step.completed
                                    ? d
                                      ? 'text-[var(--cp-muted)] line-through'
                                      : 'line-through text-gray-400'
                                    : d
                                      ? 'text-[var(--cp-text)]'
                                      : 'text-gray-700'
                                }`}
                              >
                                {step.text}
                              </div>
                              {step.completedAt && (
                                <div className="mt-0.5 text-xs" style={{ color: accent }}>
                                  ✓ {step.completedAt}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

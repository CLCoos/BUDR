'use client';
import React, { useState } from 'react';
import { CheckCircle2, Circle, Target, Plus } from 'lucide-react';

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

const goals: Goal[] = [
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

interface Props {
  compact?: boolean;
}

export default function GoalProgress({ compact }: Props) {
  const [expanded, setExpanded] = useState<string>('gp-001');

  const getProgress = (goal: Goal) => {
    const done = goal.steps.filter((s) => s.completed).length;
    return { done, total: goal.steps.length, pct: Math.round((done / goal.steps.length) * 100) };
  };

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-[#1D9E75]" />
          <span className="text-sm font-semibold text-gray-800">Mål</span>
          <span className="text-xs text-gray-400">{goals.length} aktive</span>
        </div>
        {!compact && (
          <button className="flex items-center gap-1 text-xs text-[#1D9E75] hover:underline">
            <Plus size={12} /> Tilføj mål
          </button>
        )}
      </div>

      <div className={compact ? '' : 'divide-y divide-gray-50'}>
        {goals.map((goal) => {
          const { done, total, pct } = getProgress(goal);
          const isExpanded = !compact && expanded === goal.id;

          return (
            <div key={goal.id}>
              <button
                onClick={() => !compact && setExpanded(isExpanded ? '' : goal.id)}
                className={`w-full px-4 py-3 text-left transition-colors ${!compact ? 'hover:bg-gray-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-sm font-medium text-gray-800 leading-snug">{goal.title}</div>
                  <span
                    className="text-xs font-bold tabular-nums flex-shrink-0"
                    style={{ color: '#1D9E75' }}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: '#1D9E75' }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    {done}/{total} trin · {goal.createdBy}
                  </div>
                  <div className="text-xs text-gray-400">{goal.createdAt}</div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-50">
                  <div className="relative pt-2">
                    <div className="absolute left-3 top-4 bottom-2 w-0.5 bg-gray-100" />
                    <div className="space-y-2.5">
                      {goal.steps.map((step, idx) => {
                        const isLocked = idx > 0 && !goal.steps[idx - 1].completed;
                        return (
                          <div key={step.id} className="flex items-start gap-3 relative">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                                step.completed
                                  ? 'bg-[#1D9E75]'
                                  : isLocked
                                    ? 'bg-gray-100'
                                    : 'bg-white border-2 border-[#1D9E75]/40'
                              }`}
                            >
                              {step.completed ? (
                                <CheckCircle2 size={12} className="text-white" />
                              ) : (
                                <Circle
                                  size={12}
                                  className={isLocked ? 'text-gray-300' : 'text-[#1D9E75]/40'}
                                />
                              )}
                            </div>
                            <div className={`flex-1 pt-0.5 ${isLocked ? 'opacity-40' : ''}`}>
                              <div
                                className={`text-xs ${step.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                              >
                                {step.text}
                              </div>
                              {step.completedAt && (
                                <div className="text-xs text-[#1D9E75] mt-0.5">
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

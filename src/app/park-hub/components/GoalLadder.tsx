'use client';
import React, { useState } from 'react';
import { CheckCircle2, Circle, Trophy, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface GoalStep {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  createdByStaff: string;
  steps: GoalStep[];
}

const initialGoals: Goal[] = [
  {
    id: 'goal-001',
    title: 'Komme ud af huset dagligt',
    description: 'Bygge en rutine med daglige ture ud af bostedet',
    createdByStaff: 'Sara K.',
    steps: [
      { id: 'step-001-1', text: 'Gå til postkassen en gang om dagen', completed: true, completedAt: '24/03/2026' },
      { id: 'step-001-2', text: 'Tag en 5 minutters tur rundt om bygningen', completed: true, completedAt: '25/03/2026' },
      { id: 'step-001-3', text: 'Gå til det lokale bageri og køb en bolle', completed: false },
      { id: 'step-001-4', text: 'Tag offentlig transport til centeret', completed: false },
      { id: 'step-001-5', text: 'Deltag i et gruppearrangement udenfor bostedet', completed: false },
    ],
  },
  {
    id: 'goal-002',
    title: 'Forbedre søvnrytme',
    description: 'Sove og vågne på faste tidspunkter',
    createdByStaff: 'Morten L.',
    steps: [
      { id: 'step-002-1', text: 'Sluk skærm 30 min før sengetid', completed: true, completedAt: '23/03/2026' },
      { id: 'step-002-2', text: 'Gå i seng senest kl. 23:00 tre dage i træk', completed: false },
      { id: 'step-002-3', text: 'Stå op kl. 08:00 uden alarm en hel uge', completed: false },
    ],
  },
];

export default function GoalLadder() {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [expandedGoal, setExpandedGoal] = useState<string>('goal-001');

  const toggleStep = (goalId: string, stepId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      const steps = g.steps.map((s, idx) => {
        if (s.id !== stepId) return s;
        if (!s.completed) {
          // Can only complete if previous step is done
          const prevStep = g.steps[idx - 1];
          if (idx > 0 && !prevStep.completed) {
            toast.error('Fuldfør det forrige trin først');
            return s;
          }
          toast.success('Trin gennemført! 🎉');
          // Backend: UPDATE park_goal_steps SET completed=true, completed_at=NOW() WHERE id=stepId
          return { ...s, completed: true, completedAt: '26/03/2026' };
        }
        return s;
      });
      return { ...g, steps };
    }));
  };

  const getProgress = (goal: Goal) => {
    const done = goal.steps.filter(s => s.completed).length;
    return Math.round((done / goal.steps.length) * 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Trophy size={16} className="text-[#7F77DD]" />
        <span className="text-sm font-semibold text-gray-700">Dine mål</span>
        <span className="text-xs text-gray-400 ml-auto">Sat af personalet</span>
      </div>

      {goals.map(goal => {
        const progress = getProgress(goal);
        const isExpanded = expandedGoal === goal.id;
        const completedSteps = goal.steps.filter(s => s.completed).length;

        return (
          <div key={goal.id} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <button
              onClick={() => setExpandedGoal(isExpanded ? '' : goal.id)}
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm">{goal.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{goal.description}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold tabular-nums" style={{ color: '#7F77DD' }}>{progress}%</div>
                  <div className="text-xs text-gray-400">{completedSteps}/{goal.steps.length}</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, backgroundColor: '#7F77DD' }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1.5">Oprettet af {goal.createdByStaff}</div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-gray-100" />

                  <div className="space-y-3">
                    {goal.steps.map((step, idx) => {
                      const isLocked = idx > 0 && !goal.steps[idx - 1].completed;
                      return (
                        <div key={step.id} className="flex items-start gap-3 relative">
                          <button
                            onClick={() => !isLocked && toggleStep(goal.id, step.id)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all z-10 ${
                              step.completed
                                ? 'bg-[#7F77DD]'
                                : isLocked
                                ? 'bg-gray-100' :'bg-white border-2 border-[#7F77DD]/40 hover:border-[#7F77DD]'
                            }`}
                          >
                            {step.completed ? (
                              <CheckCircle2 size={14} className="text-white" />
                            ) : isLocked ? (
                              <Lock size={10} className="text-gray-400" />
                            ) : (
                              <Circle size={14} className="text-[#7F77DD]/40" />
                            )}
                          </button>
                          <div className={`flex-1 pt-0.5 ${isLocked ? 'opacity-40' : ''}`}>
                            <div className={`text-sm ${step.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                              {step.text}
                            </div>
                            {step.completedAt && (
                              <div className="text-xs text-[#7F77DD] mt-0.5">✓ Gennemført {step.completedAt}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {progress === 100 && (
                  <div className="mt-4 bg-[#7F77DD]/10 rounded-lg p-3 text-center">
                    <div className="text-lg mb-1">🏆</div>
                    <div className="text-sm font-semibold text-[#7F77DD]">Mål opnået!</div>
                    <div className="text-xs text-gray-500">Fantastisk arbejde, Anders</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import Lys, { LysMood } from '@/components/Lys';
import BareEtSkridt from '@/components/BareEtSkridt';
import Mønsterspejlet from '@/components/Mønsterspejlet';
import Støttecirklen from '@/components/Støttecirklen';
import WeeklyInsightTeaser from '@/components/WeeklyInsightTeaser';
import CareTeamPlannerStrip from '@/components/CareTeamPlannerStrip';
import CompanionAvatar from '@/components/CompanionAvatar';
import { CompanionReaction } from '@/components/CompanionAvatar';

export interface Task {
  id: string;
  title: string;
  emoji: string;
  duration: string;
  category: string;
  timeBlock: 'morgen' | 'eftermiddag' | 'aften';
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  isRecommended: boolean;
  difficulty: 'let' | 'normal' | 'udfordrende';
  energy: number; // 1-5 energy cost
}

const initialTasks: Task[] = [
  {
    id: 'task-001',
    title: 'Stå op og stræk dig',
    emoji: '🌅',
    duration: '5 min',
    category: 'Krop',
    timeBlock: 'morgen',
    status: 'completed',
    isRecommended: true,
    difficulty: 'let',
    energy: 1,
  },
  {
    id: 'task-002',
    title: 'Spis morgenmad',
    emoji: '🍳',
    duration: '20 min',
    category: 'Mad',
    timeBlock: 'morgen',
    status: 'completed',
    isRecommended: true,
    difficulty: 'let',
    energy: 1,
  },
  {
    id: 'task-003',
    title: 'Tag din medicin',
    emoji: '💊',
    duration: '2 min',
    category: 'Sundhed',
    timeBlock: 'morgen',
    status: 'in-progress',
    isRecommended: true,
    difficulty: 'let',
    energy: 1,
  },
  {
    id: 'task-004',
    title: 'Tjek din dagplan',
    emoji: '📋',
    duration: '5 min',
    category: 'Struktur',
    timeBlock: 'morgen',
    status: 'pending',
    isRecommended: true,
    difficulty: 'let',
    energy: 1,
  },
  {
    id: 'task-005',
    title: 'Gå en lille tur',
    emoji: '🚶',
    duration: '20 min',
    category: 'Bevægelse',
    timeBlock: 'eftermiddag',
    status: 'pending',
    isRecommended: true,
    difficulty: 'normal',
    energy: 3,
  },
  {
    id: 'task-006',
    title: 'Spis frokost',
    emoji: '🥗',
    duration: '25 min',
    category: 'Mad',
    timeBlock: 'eftermiddag',
    status: 'pending',
    isRecommended: true,
    difficulty: 'let',
    energy: 1,
  },
  {
    id: 'task-007',
    title: 'Ring til en ven',
    emoji: '📞',
    duration: '15 min',
    category: 'Social',
    timeBlock: 'eftermiddag',
    status: 'pending',
    isRecommended: false,
    difficulty: 'normal',
    energy: 3,
  },
  {
    id: 'task-008',
    title: 'Hvil 20 minutter',
    emoji: '😴',
    duration: '20 min',
    category: 'Hvile',
    timeBlock: 'eftermiddag',
    status: 'pending',
    isRecommended: true,
    difficulty: 'let',
    energy: 1,
  },
  {
    id: 'task-009',
    title: 'Kreativ aktivitet',
    emoji: '🎨',
    duration: '30 min',
    category: 'Kreativitet',
    timeBlock: 'eftermiddag',
    status: 'pending',
    isRecommended: false,
    difficulty: 'normal',
    energy: 3,
  },
  {
    id: 'task-010',
    title: 'Spis aftensmad',
    emoji: '🍽️',
    duration: '30 min',
    category: 'Mad',
    timeBlock: 'aften',
    status: 'pending',
    isRecommended: true,
    difficulty: 'let',
    energy: 1,
  },
  {
    id: 'task-011',
    title: 'Skriv i din journal',
    emoji: '📓',
    duration: '10 min',
    category: 'Refleksion',
    timeBlock: 'aften',
    status: 'pending',
    isRecommended: true,
    difficulty: 'let',
    energy: 2,
  },
  {
    id: 'task-012',
    title: 'Aftenroutine og seng',
    emoji: '🌙',
    duration: '20 min',
    category: 'Søvn',
    timeBlock: 'aften',
    status: 'pending',
    isRecommended: true,
    difficulty: 'let',
    energy: 1,
  },
];

type ViewMode = 'energiflod' | 'stotte' | 'monster';

const timeBlockConfig = {
  morgen: {
    label: 'Morgen',
    emoji: '🌅',
    gradient: 'from-sunrise-500/20 to-sunrise-400/10',
    accent: '#FB923C',
    accentLight: 'rgba(251,146,60,0.15)',
    border: 'border-sunrise-500/20',
    pill: 'bg-sunrise-500/20 text-sunrise-300',
    width: '35%',
  },
  eftermiddag: {
    label: 'Eftermiddag',
    emoji: '☀️',
    gradient: 'from-aurora-blue/20 to-aurora-teal/10',
    accent: '#60A5FA',
    accentLight: 'rgba(96,165,250,0.15)',
    border: 'border-blue-400/20',
    pill: 'bg-blue-400/20 text-blue-300',
    width: '45%',
  },
  aften: {
    label: 'Aften',
    emoji: '🌙',
    gradient: 'from-aurora-violet/20 to-midnight-700/30',
    accent: '#A78BFA',
    accentLight: 'rgba(167,139,250,0.15)',
    border: 'border-aurora-violet/20',
    pill: 'bg-aurora-violet/20 text-purple-300',
    width: '20%',
  },
};

function getLysMood(percent: number): LysMood {
  if (percent >= 80) return 'happy';
  if (percent >= 50) return 'energized';
  if (percent >= 30) return 'focused';
  if (percent >= 10) return 'calm';
  return 'tired';
}

export default function DailyStructureView() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isRestDay, setIsRestDay] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('energiflod');
  const [showBareEtSkridt, setShowBareEtSkridt] = useState(false);
  const [showLysMessage, setShowLysMessage] = useState(false);
  const [allDoneReaction, setAllDoneReaction] = useState<CompanionReaction>('idle');
  const [companion, setCompanion] = useState('bjorn');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('budr_companion');
      if (saved) setCompanion(saved);
    }
  }, []);

  const completed = tasks.filter((t) => t.status === 'completed').length;
  const total = tasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const lysMood = getLysMood(percent);
  const allTasksDone = completed === total && total > 0;

  // Trigger celebrate reaction when all tasks are done
  useEffect(() => {
    if (allTasksDone) {
      const t = setTimeout(() => setAllDoneReaction('celebrate'), 400);
      return () => clearTimeout(t);
    }
  }, [allTasksDone]);

  const handleCompleteTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
      )
    );
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== 'completed') {
      toast.success(`${task.emoji} ${task.title} klaret! +10 XP`, { duration: 2000 });
    }
  };

  const handleSkipTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: t.status === 'skipped' ? 'pending' : 'skipped' } : t
      )
    );
  };

  const nextPendingTask = tasks.find((t) => t.status === 'pending' || t.status === 'in-progress');

  const morgenTasks = tasks.filter((t) => t.timeBlock === 'morgen');
  const eftermiddagTasks = tasks.filter((t) => t.timeBlock === 'eftermiddag');
  const aftenTasks = tasks.filter((t) => t.timeBlock === 'aften');

  const today = new Date().toLocaleDateString('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="min-h-screen gradient-midnight pb-28">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-midnight-900/90 backdrop-blur-xl border-b border-midnight-700/50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-base sm:text-lg font-bold text-midnight-50 capitalize">
                {today}
              </h1>
              <p className="text-xs text-midnight-400 mt-0.5">
                {completed} af {total} gennemført
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="streak-badge text-xs px-2 py-0.5">🔥 7</div>
              <div className="xp-badge text-xs px-2 py-0.5">⚡ 340</div>
            </div>
          </div>

          {/* View mode tabs */}
          <div className="flex gap-1.5 mt-3">
            {(
              [
                { key: 'energiflod', label: 'Min dag', shortLabel: 'Min dag' },
                { key: 'stotte', label: 'Min støtte', shortLabel: 'Støtte' },
                { key: 'monster', label: 'Min fremgang', shortLabel: 'Fremgang' },
              ] as { key: ViewMode; label: string; shortLabel: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[36px] truncate px-1 ${
                  viewMode === tab.key
                    ? 'bg-sunrise-400/20 text-sunrise-300 border border-sunrise-400/30'
                    : 'bg-midnight-800 text-midnight-400 border border-midnight-700 hover:text-midnight-200'
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Lys companion */}
        <div className="flex items-center gap-3 mb-5 bg-midnight-800/50 rounded-2xl p-4 border border-midnight-700/50">
          <Lys
            mood={lysMood}
            size="md"
            showMessage={showLysMessage}
            onTap={() => setShowLysMessage(true)}
          />
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm font-semibold text-midnight-100 mb-0.5">
              Lys er med dig
            </p>
            <p className="text-xs text-midnight-400 leading-relaxed">
              {percent >= 80
                ? 'Fantastisk dag! Du strålende! ✨'
                : percent >= 50
                  ? 'Du er godt på vej. Bliv ved! 💪'
                  : percent >= 20
                    ? 'Tag det i dit eget tempo. 🌱'
                    : 'Bare ét skridt ad gangen. 🫂'}
            </p>
            <button
              onClick={() => setShowBareEtSkridt(true)}
              className="mt-1.5 text-xs text-sunrise-400 hover:text-sunrise-300 font-medium transition-colors min-h-[32px] flex items-center"
            >
              Overvældet? → Bare ét skridt
            </button>
          </div>
        </div>

        <div className="mb-4">
          <WeeklyInsightTeaser />
        </div>

        <CareTeamPlannerStrip />

        {/* Rest day toggle */}
        <div className="flex items-center justify-between bg-midnight-800/50 rounded-2xl px-4 py-3 border border-midnight-700/50 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌙</span>
            <span className="text-sm font-medium text-midnight-200">Hviledag</span>
          </div>
          <button
            onClick={() => setIsRestDay(!isRestDay)}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 min-w-[48px] ${
              isRestDay ? 'bg-aurora-violet' : 'bg-midnight-600'
            }`}
            aria-label="Skift hviledag"
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
                isRestDay ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        {isRestDay ? (
          <div className="bg-midnight-800/60 rounded-3xl border border-aurora-violet/20 p-8 flex flex-col items-center text-center">
            <div className="animate-float text-5xl mb-4">🌙</div>
            <h2 className="font-display text-xl font-bold text-midnight-50 mb-2">
              Det er din hviledag
            </h2>
            <p className="text-midnight-400 text-sm leading-relaxed max-w-xs">
              Du behøver ikke gøre noget i dag. Hvile er også fremgang.
            </p>
          </div>
        ) : allTasksDone ? (
          /* All tasks completed — companion celebration empty state */
          <div className="flex flex-col items-center text-center py-10 px-4 bg-midnight-800/40 rounded-3xl border border-emerald-400/20 animate-slide-up">
            <div className="relative mb-4">
              {/* Confetti ring */}
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20 bg-emerald-400/30"
                style={{ animationDuration: '2s' }}
              />
              <CompanionAvatar
                companion={companion}
                size="xl"
                animate
                mood="excited"
                clickable
                reaction={allDoneReaction}
                onReactionEnd={() => setAllDoneReaction('idle')}
              />
              <span className="absolute -top-3 -right-3 text-2xl animate-bounce">🎉</span>
              <span
                className="absolute -bottom-2 -left-3 text-xl animate-bounce"
                style={{ animationDelay: '0.3s' }}
              >
                ⭐
              </span>
              <span
                className="absolute top-0 -left-4 text-lg animate-bounce"
                style={{ animationDelay: '0.6s' }}
              >
                ✨
              </span>
            </div>
            <h2 className="font-display text-xl font-bold text-midnight-50 mb-2">
              Alle opgaver klaret! 🏆
            </h2>
            <p className="text-sm text-midnight-400 leading-relaxed max-w-xs mb-4">
              Du har gennemført hele dagen. Det er noget at fejre — tryk på din ledsager for en
              hilsen!
            </p>
            <div className="flex gap-2 flex-wrap justify-center">
              <span className="bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full">
                🔥 Streak bevaret
              </span>
              <span className="bg-aurora-violet/15 border border-aurora-violet/30 text-purple-300 text-xs font-semibold px-3 py-1 rounded-full">
                ⚡ +{completed * 10} XP
              </span>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'energiflod' && (
              <Energiflod
                morgenTasks={morgenTasks}
                eftermiddagTasks={eftermiddagTasks}
                aftenTasks={aftenTasks}
                onComplete={handleCompleteTask}
                onSkip={handleSkipTask}
              />
            )}
            {viewMode === 'stotte' && (
              <div className="bg-midnight-800/50 rounded-3xl border border-midnight-700/50 p-6">
                <Støttecirklen />
              </div>
            )}
            {viewMode === 'monster' && <Mønsterspejlet />}
          </>
        )}
      </div>

      {/* Bare ét skridt overlay */}
      {showBareEtSkridt && (
        <BareEtSkridt
          onClose={() => setShowBareEtSkridt(false)}
          nextTask={
            nextPendingTask
              ? {
                  emoji: nextPendingTask.emoji,
                  title: nextPendingTask.title,
                  duration: nextPendingTask.duration,
                }
              : undefined
          }
        />
      )}

      <BottomNav />
    </div>
  );
}

/* ===== ENERGIFLOD COMPONENT ===== */
interface EnergiflodProps {
  morgenTasks: Task[];
  eftermiddagTasks: Task[];
  aftenTasks: Task[];
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
}

function Energiflod({
  morgenTasks,
  eftermiddagTasks,
  aftenTasks,
  onComplete,
  onSkip,
}: EnergiflodProps) {
  const blocks = [
    { tasks: morgenTasks, config: timeBlockConfig.morgen },
    { tasks: eftermiddagTasks, config: timeBlockConfig.eftermiddag },
    { tasks: aftenTasks, config: timeBlockConfig.aften },
  ];

  return (
    <div className="space-y-4">
      {/* River header */}
      <div className="river-flow-bg rounded-2xl p-4 border border-midnight-700/30">
        <p className="text-xs text-midnight-300 text-center font-medium">
          🌊 Din dag flyder som en flod — rolig og aktiv i skift
        </p>
      </div>

      {blocks.map(({ tasks, config }) => {
        const blockCompleted = tasks.filter((t) => t.status === 'completed').length;
        const blockTotal = tasks.length;
        const blockPercent = blockTotal > 0 ? Math.round((blockCompleted / blockTotal) * 100) : 0;

        return (
          <div
            key={config.label}
            className={`rounded-3xl border ${config.border} overflow-hidden`}
            style={{
              background: `linear-gradient(135deg, ${config.accentLight} 0%, rgba(15,15,35,0.8) 100%)`,
            }}
          >
            {/* Block header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{config.emoji}</span>
                <span className="font-display text-sm font-bold text-midnight-100">
                  {config.label}
                </span>
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${config.pill}`}>
                  {blockCompleted}/{blockTotal}
                </span>
              </div>
              {/* Mini progress */}
              <div className="w-16 h-1.5 bg-midnight-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${blockPercent}%`,
                    background: config.accent,
                  }}
                />
              </div>
            </div>

            {/* Tasks */}
            <div className="px-4 pb-4 space-y-2">
              {tasks.map((task) => (
                <RiverTask
                  key={task.id}
                  task={task}
                  accent={config.accent}
                  onComplete={onComplete}
                  onSkip={onSkip}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface RiverTaskProps {
  task: Task;
  accent: string;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
}

function RiverTask({ task, accent, onComplete, onSkip }: RiverTaskProps) {
  const isCompleted = task.status === 'completed';
  const isSkipped = task.status === 'skipped';

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all duration-300 ${
        isCompleted
          ? 'bg-midnight-900/40 border-midnight-700/30 opacity-60'
          : isSkipped
            ? 'bg-midnight-900/20 border-midnight-700/20 opacity-40'
            : 'bg-midnight-900/60 border-midnight-700/40 hover:border-midnight-600/60'
      }`}
    >
      {/* Complete button */}
      <button
        onClick={() => onComplete(task.id)}
        className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 active:scale-90"
        style={{
          borderColor: isCompleted ? accent : 'rgba(255,255,255,0.15)',
          background: isCompleted ? accent : 'transparent',
        }}
        aria-label={isCompleted ? 'Markér som ikke gennemført' : 'Markér som gennemført'}
      >
        {isCompleted && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="#0f0f1a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Emoji */}
      <span className="text-xl flex-shrink-0">{task.emoji}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium leading-tight ${isCompleted || isSkipped ? 'line-through text-midnight-500' : 'text-midnight-100'}`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-midnight-500">{task.duration}</span>
          {task.isRecommended && <span className="text-xs text-sunrise-400/70">★</span>}
        </div>
      </div>

      {/* Energy dots */}
      <div className="flex gap-0.5 flex-shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`e-${i}`}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: i < task.energy ? accent : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>

      {/* Skip */}
      {!isCompleted && (
        <button
          onClick={() => onSkip(task.id)}
          className="flex-shrink-0 text-midnight-600 hover:text-midnight-400 transition-colors text-xs"
          aria-label="Spring over"
        >
          ✕
        </button>
      )}
    </div>
  );
}

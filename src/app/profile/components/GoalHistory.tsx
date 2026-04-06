'use client';

import React, { useState } from 'react';

interface GoalEntry {
  id: string;
  text: string;
  category: string;
  emoji: string;
  completedDays: number;
  totalDays: number;
  active: boolean;
  addedDate: string;
}

const INITIAL_GOALS: GoalEntry[] = [
  {
    id: 'goal-1',
    text: 'Drik 2 liter vand dagligt',
    category: 'Sundhed',
    emoji: '💧',
    completedDays: 18,
    totalDays: 23,
    active: true,
    addedDate: '1. marts',
  },
  {
    id: 'goal-2',
    text: 'Gå en tur hver dag',
    category: 'Bevægelse',
    emoji: '🚶',
    completedDays: 14,
    totalDays: 23,
    active: true,
    addedDate: '1. marts',
  },
  {
    id: 'goal-3',
    text: 'Skriv i journalen',
    category: 'Refleksion',
    emoji: '📓',
    completedDays: 20,
    totalDays: 23,
    active: true,
    addedDate: '1. marts',
  },
  {
    id: 'goal-4',
    text: 'Ring til en ven om ugen',
    category: 'Social',
    emoji: '📞',
    completedDays: 3,
    totalDays: 4,
    active: true,
    addedDate: '8. marts',
  },
  {
    id: 'goal-5',
    text: 'Sov 8 timer',
    category: 'Søvn',
    emoji: '😴',
    completedDays: 10,
    totalDays: 14,
    active: false,
    addedDate: '1. marts',
  },
];

const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  Sundhed: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300' },
  Bevægelse: { bg: 'bg-sunrise-400/15', border: 'border-sunrise-400/30', text: 'text-sunrise-300' },
  Refleksion: {
    bg: 'bg-aurora-violet/15',
    border: 'border-aurora-violet/30',
    text: 'text-purple-300',
  },
  Social: { bg: 'bg-sky-400/15', border: 'border-sky-400/30', text: 'text-sky-300' },
  Søvn: { bg: 'bg-blue-400/15', border: 'border-blue-400/30', text: 'text-blue-300' },
};

export default function GoalHistory() {
  const [goals, setGoals] = useState<GoalEntry[]>(INITIAL_GOALS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  const [filter, setFilter] = useState<'alle' | 'aktive' | 'afsluttede'>('alle');

  const startEdit = (goal: GoalEntry) => {
    setEditingId(goal.id);
    setEditText(goal.text);
  };

  const saveEdit = (id: string) => {
    if (!editText.trim()) return;
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, text: editText.trim() } : g)));
    setEditingId(null);
  };

  const toggleActive = (id: string) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, active: !g.active } : g)));
  };

  const removeGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const addGoal = () => {
    const text = newGoalText.trim();
    if (!text) return;
    const newGoal: GoalEntry = {
      id: `goal-${Date.now()}`,
      text,
      category: 'Sundhed',
      emoji: '🎯',
      completedDays: 0,
      totalDays: 0,
      active: true,
      addedDate: new Date().toLocaleDateString('da-DK', { day: 'numeric', month: 'long' }),
    };
    setGoals((prev) => [newGoal, ...prev]);
    setNewGoalText('');
    setShowAddForm(false);
  };

  const filteredGoals = goals.filter((g) => {
    if (filter === 'aktive') return g.active;
    if (filter === 'afsluttede') return !g.active;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter + Add */}
      <div className="flex items-center gap-2">
        {(['alle', 'aktive', 'afsluttede'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 capitalize ${
              filter === f
                ? 'bg-sunrise-400/20 text-sunrise-300 border border-sunrise-400/30'
                : 'bg-midnight-800 border border-midnight-700 text-midnight-400 hover:text-midnight-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="bg-aurora-teal/20 hover:bg-aurora-teal/30 text-aurora-teal font-bold rounded-xl px-4 py-2 text-sm transition-all duration-200 active:scale-95 flex-shrink-0 border border-aurora-teal/30"
        >
          + Nyt mål
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="card-dark animate-slide-up">
          <h3 className="font-display text-sm font-bold text-midnight-100 mb-3">
            🎯 Tilføj nyt mål
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newGoalText}
              onChange={(e) => setNewGoalText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addGoal()}
              placeholder="Beskriv dit mål..."
              autoFocus
              className="flex-1 rounded-xl border-2 border-midnight-600 bg-midnight-900 px-3 py-2 text-sm text-midnight-100 placeholder-midnight-600 focus:outline-none focus:border-sunrise-400 transition-colors"
            />
            <button
              onClick={addGoal}
              disabled={!newGoalText.trim()}
              className="bg-sunrise-400 hover:bg-sunrise-500 disabled:opacity-40 text-midnight-900 font-bold rounded-xl px-4 py-2 text-sm transition-all duration-200 active:scale-95"
            >
              Gem
            </button>
          </div>
        </div>
      )}

      {/* Goal cards */}
      {filteredGoals.length === 0 && (
        <div className="card-dark text-center py-8">
          <p className="text-midnight-400 text-sm">Ingen mål i denne kategori</p>
        </div>
      )}

      {filteredGoals.map((goal) => {
        const pct =
          goal.totalDays > 0 ? Math.round((goal.completedDays / goal.totalDays) * 100) : 0;
        const colors = categoryColors[goal.category] ?? {
          bg: 'bg-midnight-700',
          border: 'border-midnight-600',
          text: 'text-midnight-300',
        };
        const isEditing = editingId === goal.id;

        return (
          <div
            key={goal.id}
            className={`card-dark transition-all duration-300 ${!goal.active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-2xl ${colors.bg} ${colors.border} border-2 flex items-center justify-center text-xl flex-shrink-0`}
              >
                {goal.emoji}
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(goal.id)}
                      autoFocus
                      className="flex-1 rounded-xl border-2 border-sunrise-400/50 bg-midnight-900 px-3 py-1.5 text-sm text-midnight-100 focus:outline-none"
                    />
                    <button
                      onClick={() => saveEdit(goal.id)}
                      className="bg-sunrise-400 text-midnight-900 font-bold rounded-xl px-3 py-1.5 text-xs active:scale-95"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="bg-midnight-700 text-midnight-300 font-bold rounded-xl px-3 py-1.5 text-xs active:scale-95"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <p
                    className={`text-sm font-semibold ${goal.active ? 'text-midnight-100' : 'text-midnight-500 line-through'} mb-1`}
                  >
                    {goal.text}
                  </p>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors.bg} ${colors.border} ${colors.text}`}
                  >
                    {goal.category}
                  </span>
                  <span className="text-xs text-midnight-500">Tilføjet {goal.addedDate}</span>
                </div>

                {/* Progress */}
                {goal.totalDays > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-midnight-400 mb-1">
                      <span>
                        {goal.completedDays}/{goal.totalDays} dage gennemført
                      </span>
                      <span className="font-bold text-sunrise-300">{pct}%</span>
                    </div>
                    <div className="h-2 bg-midnight-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sunrise-400 to-aurora-teal rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-midnight-700">
              <button
                onClick={() => startEdit(goal)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-midnight-700 text-midnight-200 hover:bg-midnight-600 transition-colors duration-200 active:scale-95"
              >
                ✏️ Rediger
              </button>
              <button
                onClick={() => toggleActive(goal.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors duration-200 active:scale-95 ${
                  goal.active
                    ? 'bg-midnight-700 text-midnight-400 hover:bg-midnight-600'
                    : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                }`}
              >
                {goal.active ? '⏸ Pause' : '▶ Genaktiver'}
              </button>
              <button
                onClick={() => removeGoal(goal.id)}
                className="py-2 px-3 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors duration-200 active:scale-95"
              >
                🗑
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

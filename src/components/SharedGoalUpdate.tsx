'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SharedGoal {
  id: string;
  title: string;
  description?: string;
  progress: number;
  isCompleted: boolean;
  createdAt: string;
}

interface SharedGoalUpdateProps {
  contactId: string;
  contactName: string;
  contactColor: string;
  contactBgColor: string;
  userId: string;
}

export default function SharedGoalUpdate({
  contactId,
  contactName,
  contactColor,
  contactBgColor,
  userId,
}: SharedGoalUpdateProps) {
  const [goals, setGoals] = useState<SharedGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    fetchGoals();

    const channel = supabase
      .channel(`shared_goals_${contactId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_goals',
          filter: `contact_id=eq.${contactId}`,
        },
        () => fetchGoals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId, supabase]);

  const fetchGoals = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('shared_goals')
        .select('*')
        .eq('contact_id', contactId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setGoals(
          data.map((row: any) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            progress: row.progress,
            isCompleted: row.is_completed,
            createdAt: row.created_at,
          }))
        );
      }
    } catch (err) {
      console.log('Error fetching shared goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async () => {
    if (!newTitle.trim() || saving || !supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('shared_goals').insert({
        user_id: userId,
        contact_id: contactId,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        progress: 0,
        is_completed: false,
      });
      if (!error) {
        setNewTitle('');
        setNewDesc('');
        setShowAdd(false);
      }
    } catch (err) {
      console.log('Error adding goal:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateProgress = async (goalId: string, progress: number) => {
    if (!supabase) return;
    try {
      await supabase
        .from('shared_goals')
        .update({ progress, is_completed: progress === 100 })
        .eq('id', goalId)
        .eq('user_id', userId);
    } catch (err) {
      console.log('Error updating progress:', err);
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!supabase) return;
    try {
      await supabase
        .from('shared_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', userId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    } catch (err) {
      console.log('Error deleting goal:', err);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-midnight-300 uppercase tracking-wider">
          Fælles mål med {contactName}
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs rounded-full px-2.5 py-1 font-medium transition-all active:scale-95"
          style={{ background: contactBgColor, color: contactColor }}
        >
          {showAdd ? '✕ Annuller' : '+ Nyt mål'}
        </button>
      </div>

      {showAdd && (
        <div
          className="rounded-xl p-3 space-y-2 border"
          style={{ background: contactBgColor, borderColor: `${contactColor}30` }}
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Målets titel…"
            className="w-full bg-transparent text-sm text-midnight-100 placeholder-midnight-500 outline-none border-b pb-1"
            style={{ borderColor: `${contactColor}30` }}
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Beskrivelse (valgfri)…"
            className="w-full bg-transparent text-xs text-midnight-300 placeholder-midnight-600 outline-none"
          />
          <button
            onClick={addGoal}
            disabled={!newTitle.trim() || saving}
            className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-40"
            style={{ background: contactColor, color: '#0f0f1a' }}
          >
            {saving ? 'Gemmer…' : 'Tilføj mål'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: contactColor }} />
        </div>
      ) : goals.length === 0 ? (
        <p className="text-xs text-midnight-500 text-center py-3">
          Ingen fælles mål endnu — tilføj et! 🎯
        </p>
      ) : (
        goals.map((goal) => (
          <div
            key={goal.id}
            className="rounded-xl p-3 border space-y-2"
            style={{ background: contactBgColor, borderColor: `${contactColor}20` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-midnight-100 truncate">
                  {goal.isCompleted ? '✅ ' : ''}{goal.title}
                </p>
                {goal.description && (
                  <p className="text-xs text-midnight-400 mt-0.5 truncate">{goal.description}</p>
                )}
              </div>
              <button
                onClick={() => deleteGoal(goal.id)}
                className="text-midnight-600 hover:text-midnight-400 text-xs transition-colors shrink-0"
                aria-label="Slet mål"
              >
                ✕
              </button>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-midnight-400">
                <span>Fremgang</span>
                <span style={{ color: contactColor }}>{goal.progress}%</span>
              </div>
              <div className="relative h-2 rounded-full bg-midnight-700 overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                  style={{ width: `${goal.progress}%`, background: contactColor }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={goal.progress}
                onChange={(e) => updateProgress(goal.id, Number(e.target.value))}
                className="w-full h-1 opacity-0 absolute cursor-pointer"
                style={{ marginTop: -8 }}
                aria-label="Opdater fremgang"
              />
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={goal.progress}
                onChange={(e) => updateProgress(goal.id, Number(e.target.value))}
                className="w-full accent-current cursor-pointer"
                style={{ accentColor: contactColor }}
                aria-label="Opdater fremgang"
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

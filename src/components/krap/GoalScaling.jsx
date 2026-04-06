'use client';

import React, { useEffect, useState } from 'react';

export default function GoalScaling({ supabase, profileId }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [goalText, setGoalText] = useState('');
  const [currentScore, setCurrentScore] = useState(5);
  const [nextStep, setNextStep] = useState('');

  const [activeGoals, setActiveGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);

  async function loadGoals() {
    if (!supabase || !profileId) return;
    setLoadingGoals(true);
    setError('');

    try {
      const { data, error: qErr } = await supabase
        .from('goals')
        .select('id, goal_text, current_score, next_step, created_at')
        .eq('profile_id', profileId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (qErr) throw qErr;
      setActiveGoals(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente dine aktive mål.');
    } finally {
      setLoadingGoals(false);
    }
  }

  useEffect(() => {
    loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, profileId]);

  async function onSave() {
    if (!supabase || !profileId) return;
    setSaving(true);
    setError('');
    setOk('');

    try {
      const trimmedGoal = goalText.trim();
      const trimmedNext = nextStep.trim();
      if (!trimmedGoal) throw new Error('Skriv dit mål først.');

      const payload = {
        profile_id: profileId,
        goal_text: trimmedGoal,
        current_score: Math.round(currentScore),
        next_step: trimmedNext,
        is_active: true,
      };

      const { error: insertError } = await supabase.from('goals').insert(payload);
      if (insertError) throw insertError;

      setOk('Gemt! Dit næste lille skridt er på plads.');
      setGoalText('');
      setNextStep('');
      setCurrentScore(5);
      await loadGoals();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke gemme målet. Prøv igen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="w-full bg-midnight-800/40 border border-midnight-600/40 rounded-3xl p-4 sm:p-6">
      <div className="mb-3">
        <h2 className="font-display text-lg font-bold text-midnight-50">Søjle 2: Mål</h2>
        <p className="text-xs text-midnight-400 mt-1">
          Skalér hvor du er nu — og vælg det næste lille skridt.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-midnight-600/40 bg-midnight-900/40 p-4">
          <label className="block text-xs font-semibold text-midnight-200 mb-2">
            Hvad vil jeg gerne?
          </label>
          <input
            value={goalText}
            onChange={(e) => setGoalText(e.target.value.slice(0, 250))}
            placeholder="Fx: Jeg vil have lidt mere ro i hverdagen…"
            className="w-full bg-midnight-950/30 border border-midnight-700/50 rounded-xl px-3 py-2 text-sm text-midnight-100 placeholder-midnight-600 focus:outline-none focus:border-sunrise-400/40"
          />
        </div>

        <div className="rounded-2xl border border-midnight-600/40 bg-midnight-900/40 p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="font-display text-sm font-bold text-midnight-50">
              Hvor tæt er du på målet? (1-10)
            </p>
            <p className="text-[10px] text-sunrise-300 font-semibold">{currentScore}/10</p>
          </div>

          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={currentScore}
            onChange={(e) => setCurrentScore(Number(e.target.value))}
            className="w-full accent-sunrise-400"
            aria-label="Vælg nuværende score mellem 1 og 10"
          />

          <div className="flex justify-between text-[10px] mt-1 text-midnight-400">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        <div className="rounded-2xl border border-midnight-600/40 bg-midnight-900/40 p-4">
          <label className="block text-xs font-semibold text-midnight-200 mb-2">Næste skridt</label>
          <textarea
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value.slice(0, 500))}
            placeholder="Fx: 5 minutter ro før jeg tjekker beskeder — eller en kort gåtur…"
            rows={3}
            className="w-full bg-midnight-950/30 border border-midnight-700/50 rounded-xl px-3 py-2 text-sm text-midnight-100 placeholder-midnight-600 focus:outline-none focus:border-sunrise-400/40 resize-none"
          />
        </div>

        <div>
          <button
            onClick={onSave}
            disabled={!supabase || !profileId || saving || goalText.trim().length === 0}
            className="w-full rounded-2xl py-3 font-display font-bold text-sm transition-all duration-200 active:scale-[0.99] shadow-sm bg-sunrise-400 hover:bg-sunrise-500 text-midnight-900 disabled:opacity-50"
          >
            {saving ? 'Gemmer…' : 'Gem mål & næste skridt'}
          </button>
          {ok ? <p className="text-sm text-emerald-200 mt-2">{ok}</p> : null}
          {error ? <p className="text-sm text-rose-300 mt-2">{error}</p> : null}
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="font-display text-sm font-bold text-midnight-50">Aktive mål</p>
            <p className="text-[10px] text-midnight-500">
              {loadingGoals ? 'Henter…' : `${activeGoals.length}`}
            </p>
          </div>

          {activeGoals.length === 0 && !loadingGoals ? (
            <p className="text-sm text-midnight-400">
              Ingen aktive mål endnu — skriv et nyt ovenfor.
            </p>
          ) : null}

          <div className="space-y-2">
            {activeGoals.map((g) => (
              <div
                key={g.id}
                className="rounded-2xl border border-midnight-600/40 bg-midnight-900/40 p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-display text-sm font-bold text-midnight-50">{g.goal_text}</p>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-sunrise-400/10 border border-sunrise-400/25 text-sunrise-200">
                    {g.current_score}/10
                  </span>
                </div>
                <p className="text-sm text-midnight-200 leading-relaxed">
                  <span className="font-semibold text-midnight-200">Næste skridt:</span>{' '}
                  {g.next_step?.trim() ? g.next_step : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

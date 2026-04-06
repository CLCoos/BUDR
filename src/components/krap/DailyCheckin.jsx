'use client';

import React, { useEffect, useMemo, useState } from 'react';

function getTodayUtcRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

const moodDescriptions = {
  1: 'Meget lav',
  2: 'Lav',
  3: 'Lidt lav',
  4: 'Urolig men i gang',
  5: 'Neutral / midt imellem',
  6: 'OK',
  7: 'God',
  8: 'Rigtig god',
  9: 'Næsten perfekt',
  10: 'Perfekt dag!',
};

export default function DailyCheckin({ supabase, profileId }) {
  const { startIso, endIso } = useMemo(() => getTodayUtcRange(), []);

  const [loading, setLoading] = useState(false);
  const [isCheckedInToday, setIsCheckedInToday] = useState(false);
  const [existingRowId, setExistingRowId] = useState(null);

  const [moodScore, setMoodScore] = useState(5);
  const [whatFilledToday, setWhatFilledToday] = useState('');

  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    if (!supabase || !profileId) return;
    setSaveOk(false);
    (async () => {
      setLoadError('');
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('id, mood_score, what_filled_today, checked_in_at')
        .eq('profile_id', profileId)
        .gte('checked_in_at', startIso)
        .lt('checked_in_at', endIso)
        .order('checked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setLoadError(error.message || 'Kunne ikke hente dagens registrering.');
        return;
      }

      if (!data) {
        setIsCheckedInToday(false);
        setExistingRowId(null);
        setMoodScore(5);
        setWhatFilledToday('');
        return;
      }

      setIsCheckedInToday(true);
      setExistingRowId(data.id);
      if (typeof data.mood_score === 'number') setMoodScore(data.mood_score);
      if (typeof data.what_filled_today === 'string') setWhatFilledToday(data.what_filled_today);
    })();
  }, [supabase, profileId, startIso, endIso]);

  const canSave = !!supabase && !!profileId && moodScore >= 1 && moodScore <= 10;

  async function onSave() {
    if (!supabase || !profileId) return;
    if (!canSave) return;

    setSaveOk(false);
    setSaveError('');
    setLoading(true);

    try {
      const checkedInAt = new Date().toISOString();
      const payload = {
        profile_id: profileId,
        user_id: profileId, // legacy kolonne (appens eksisterende demo-data bruger den)
        mood_score: Math.round(moodScore),
        what_filled_today: whatFilledToday,
        checked_in_at: checkedInAt,
      };

      if (existingRowId) {
        const { error } = await supabase
          .from('daily_checkins')
          .update(payload)
          .eq('id', existingRowId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('daily_checkins').insert(payload);
        if (error) throw error;
      }

      setIsCheckedInToday(true);
      setSaveOk(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Kunne ikke gemme. Prøv igen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full bg-midnight-800/40 border border-midnight-600/40 rounded-3xl p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-display text-lg font-bold text-midnight-50">Søjle 1: Registrering</h2>
          <p className="text-xs text-midnight-400 mt-1">
            Et roligt overblik over, hvad der fyldte i dag.
          </p>
        </div>
        {isCheckedInToday ? (
          <div className="shrink-0 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
            <span className="text-emerald-200">✓</span>
            <span className="text-xs font-semibold text-emerald-100">Gemt i dag</span>
          </div>
        ) : (
          <div className="shrink-0 inline-flex items-center gap-2 rounded-full border border-slate-600/40 bg-slate-800/20 px-3 py-1.5">
            <span className="text-slate-300">🕊️</span>
            <span className="text-xs font-semibold text-slate-200">Klar til at gemme</span>
          </div>
        )}
      </div>

      {loadError ? <p className="text-sm text-rose-300 mb-3">{loadError}</p> : null}

      <div className="space-y-4">
        <div className="rounded-2xl border border-midnight-600/40 bg-midnight-900/40 p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>
                🌿
              </span>
              <p className="font-display text-sm font-bold text-midnight-50">Humørskala (1-10)</p>
            </div>
            <p className="text-xs font-semibold text-sunrise-300">
              {moodScore}/10 · {moodDescriptions[moodScore] ?? '—'}
            </p>
          </div>

          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={moodScore}
            onChange={(e) => setMoodScore(Number(e.target.value))}
            className="w-full accent-sunrise-400"
            aria-label="Vælg humørscore mellem 1 og 10"
          />

          <div className="flex justify-between text-[10px] mt-1 text-midnight-400">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        <div className="rounded-2xl border border-midnight-600/40 bg-midnight-900/40 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="font-display text-sm font-bold text-midnight-50">Hvad fyldte i dag?</p>
            <p className="text-[10px] text-midnight-500 mt-0.5">
              {whatFilledToday.trim().length}/500
            </p>
          </div>

          <textarea
            value={whatFilledToday}
            onChange={(e) => setWhatFilledToday(e.target.value.slice(0, 500))}
            placeholder="Fx: én lille samtale, en rolig stund, eller noget der fyldte mere end jeg havde lyst til…"
            rows={4}
            className="w-full bg-midnight-950/30 border border-midnight-700/50 rounded-xl px-3 py-2 text-sm text-midnight-100 placeholder-midnight-600 focus:outline-none focus:border-sunrise-400/40 resize-none"
          />
        </div>

        <div>
          <button
            onClick={onSave}
            disabled={!canSave || loading}
            className="w-full rounded-2xl py-3 font-display font-bold text-sm transition-all duration-200 active:scale-[0.99] shadow-sm bg-sunrise-400 hover:bg-sunrise-500 text-midnight-900 disabled:opacity-50"
          >
            {loading ? 'Gemmer…' : isCheckedInToday ? 'Opdater registrering' : 'Gem registrering'}
          </button>
          {saveError ? <p className="text-sm text-rose-300 mt-2">{saveError}</p> : null}
          {saveOk ? (
            <p className="text-sm text-emerald-200 mt-2">
              Tak. Det er registreret — og det tæller.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

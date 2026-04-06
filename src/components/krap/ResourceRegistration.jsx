'use client';

import React, { useMemo, useState } from 'react';

function getISOWeekAndYear(date) {
  // ISO-uge: uge starter mandag, og uge 1 er den uge der indeholder årets første torsdag.
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7; // 1=Mon ... 7=Sun
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return { weekNumber, year: tmp.getUTCFullYear() };
}

export default function ResourceRegistration({ supabase, profileId }) {
  const today = useMemo(() => new Date(), []);
  const { weekNumber, year } = useMemo(() => getISOWeekAndYear(today), [today]);

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [whatWentWell, setWhatWentWell] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function toggleCategory(c) {
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  async function onSave() {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (!supabase || !profileId) throw new Error('Du er ikke logget ind.');
      if (selectedCategories.length === 0) throw new Error('Vælg mindst én kategori.');

      const rows = selectedCategories.map((c) => ({
        profile_id: profileId,
        week_number: weekNumber,
        year: year,
        category: c,
        what_went_well: whatWentWell,
      }));

      const { error: insertError } = await supabase.from('resource_registrations').insert(rows);
      if (insertError) throw insertError;

      setMessage(`Gemt til uge ${weekNumber} (${year}). Tak for det.`);
      setWhatWentWell('');
      setSelectedCategories([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke gemme. Prøv igen.');
    } finally {
      setSaving(false);
    }
  }

  const categories = ['Krop', 'Relationer', 'Aktiviteter', 'Andet'];

  return (
    <section className="w-full bg-midnight-800/40 border border-midnight-600/40 rounded-3xl p-4 sm:p-6">
      <div className="mb-3">
        <h2 className="font-display text-lg font-bold text-midnight-50">Søjle 1: Ressourcer</h2>
        <p className="text-xs text-midnight-400 mt-1">Hvad gik godt denne uge?</p>
      </div>

      <div className="mb-3">
        <div className="text-xs font-semibold text-midnight-200 mb-2">
          Vælg kategorier (én eller flere)
        </div>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((c) => {
            const active = selectedCategories.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCategory(c)}
                type="button"
                className={`rounded-2xl px-3 py-2 text-sm font-semibold border transition-all duration-200 active:scale-[0.99] ${
                  active
                    ? 'bg-sunrise-400/15 border-sunrise-400/35 text-sunrise-200'
                    : 'bg-midnight-900/30 border-midnight-700/40 text-midnight-200 hover:bg-midnight-900/40'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-midnight-600/40 bg-midnight-900/40 p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="font-display text-sm font-bold text-midnight-50">Hvad gik godt?</p>
          <p className="text-[10px] text-midnight-500 mt-0.5">{whatWentWell.trim().length}/500</p>
        </div>

        <textarea
          value={whatWentWell}
          onChange={(e) => setWhatWentWell(e.target.value.slice(0, 500))}
          placeholder="Fx: jeg fik gjort én ting færdig uden at presse mig; en ven tjekkede ind; kroppen føltes lettere…"
          rows={4}
          className="w-full bg-midnight-950/30 border border-midnight-700/50 rounded-xl px-3 py-2 text-sm text-midnight-100 placeholder-midnight-600 focus:outline-none focus:border-sunrise-400/40 resize-none"
        />
      </div>

      {error ? <p className="text-sm text-rose-300 mt-3">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-200 mt-3">{message}</p> : null}

      <div className="mt-3">
        <button
          onClick={onSave}
          disabled={
            !supabase ||
            !profileId ||
            saving ||
            selectedCategories.length === 0 ||
            whatWentWell.trim().length === 0
          }
          className="w-full rounded-2xl py-3 font-display font-bold text-sm transition-all duration-200 active:scale-[0.99] shadow-sm bg-sunrise-400 hover:bg-sunrise-500 text-midnight-900 disabled:opacity-50"
        >
          {saving ? 'Gemmer…' : `Gem ressourcer (uge ${weekNumber})`}
        </button>
      </div>
    </section>
  );
}

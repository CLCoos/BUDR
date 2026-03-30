'use client';

import React, { useEffect, useState } from 'react';

export default function ThoughtCheck({ supabase, profileId }) {
  const [troublingThought, setTroublingThought] = useState('');
  const [counterThought, setCounterThought] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [lastChecks, setLastChecks] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadLast() {
    if (!supabase || !profileId) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: qErr } = await supabase
        .from('thought_checks')
        .select('id, troubling_thought, counter_thought, created_at')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(3);
      if (qErr) throw qErr;
      setLastChecks(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente dine seneste tanketjek.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, profileId]);

  async function onSave() {
    if (!supabase || !profileId) return;
    setSaving(true);
    setError('');
    setOk('');

    try {
      const t = troublingThought.trim();
      const c = counterThought.trim();
      if (!t) throw new Error('Skriv din bekymrende tanke først.');
      if (!c) throw new Error('Skriv en mod-tanke, der føles mere hjælpsom.');

      const payload = {
        profile_id: profileId,
        troubling_thought: t,
        counter_thought: c,
      };

      const { error: insertError } = await supabase.from('thought_checks').insert(payload);
      if (insertError) throw insertError;

      setOk('Gemt. Du gav din hjerne en venligere stemme.');
      setTroublingThought('');
      setCounterThought('');
      await loadLast();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke gemme. Prøv igen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="w-full bg-midnight-800/40 border border-midnight-600/40 rounded-3xl p-4 sm:p-6">
      <div className="mb-3">
        <h2 className="font-display text-lg font-bold text-midnight-50">Søjle 3: Tanketjek</h2>
        <p className="text-xs text-midnight-400 mt-1">Find den tanke, der fylder — og svar den med en mod-tanke.</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-midnight-600/40 bg-midnight-900/40 p-4">
          <label className="block text-xs font-semibold text-midnight-200 mb-2">Bekymrende tanke</label>
          <textarea
            value={troublingThought}
            onChange={(e) => setTroublingThought(e.target.value.slice(0, 500))}
            placeholder="Fx: ‘Jeg kommer til at fejle…’ eller ‘Det her bliver for meget…’"
            rows={3}
            className="w-full bg-midnight-950/30 border border-midnight-700/50 rounded-xl px-3 py-2 text-sm text-midnight-100 placeholder-midnight-600 focus:outline-none focus:border-sunrise-400/40 resize-none"
          />
        </div>

        <div className="rounded-2xl border border-midnight-600/40 bg-midnight-900/40 p-4">
          <label className="block text-xs font-semibold text-midnight-200 mb-2">Modtanke</label>
          <textarea
            value={counterThought}
            onChange={(e) => setCounterThought(e.target.value.slice(0, 500))}
            placeholder="Fx: ‘Jeg har prøvet før — jeg kan tage én lille ting ad gangen.’"
            rows={3}
            className="w-full bg-midnight-950/30 border border-midnight-700/50 rounded-xl px-3 py-2 text-sm text-midnight-100 placeholder-midnight-600 focus:outline-none focus:border-sunrise-400/40 resize-none"
          />
        </div>

        <div>
          <button
            onClick={onSave}
            disabled={!supabase || !profileId || saving || troublingThought.trim().length === 0 || counterThought.trim().length === 0}
            className="w-full rounded-2xl py-3 font-display font-bold text-sm transition-all duration-200 active:scale-[0.99] shadow-sm bg-sunrise-400 hover:bg-sunrise-500 text-midnight-900 disabled:opacity-50"
          >
            {saving ? 'Gemmer…' : 'Gem tanketjek'}
          </button>
          {ok ? <p className="text-sm text-emerald-200 mt-2">{ok}</p> : null}
          {error ? <p className="text-sm text-rose-300 mt-2">{error}</p> : null}
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="font-display text-sm font-bold text-midnight-50">Seneste tanketjek</p>
            <p className="text-[10px] text-midnight-500">{loading ? 'Henter…' : `${lastChecks.length}/3`}</p>
          </div>

          {lastChecks.length === 0 && !loading ? (
            <p className="text-sm text-midnight-400">Ingen tanketjek endnu — gem én, når du har lyst.</p>
          ) : null}

          <div className="space-y-2">
            {lastChecks.map((t) => (
              <div key={t.id} className="rounded-2xl border border-midnight-600/40 bg-midnight-900/40 p-4">
                <p className="text-xs font-semibold text-midnight-200 mb-1">Bekymrende tanke</p>
                <p className="text-sm text-midnight-100 leading-relaxed mb-2">{t.troubling_thought || '—'}</p>
                <p className="text-xs font-semibold text-midnight-200 mb-1">Modtanke</p>
                <p className="text-sm text-midnight-200 leading-relaxed">
                  {t.counter_thought || '—'}
                </p>
                {t.created_at ? (
                  <p className="text-[10px] text-midnight-500 mt-2">
                    {new Date(t.created_at).toLocaleString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


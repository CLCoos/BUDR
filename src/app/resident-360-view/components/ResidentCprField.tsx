'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Eye, EyeOff, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { formatCpr, isValidCpr } from '@/lib/residents/cpr';

const REVEAL_MS = 20_000;

/**
 * CPR øverst på borgerens side. Vises skjult (fødselsdato + ••••); «Vis» henter hele nummeret
 * i 20 sekunder, og visningen logges i databasen. Kun medarbejdere med «Administrer beboere»
 * kan tilføje eller rette. Findes funktionerne ikke (fx demo), vises intet.
 */
export default function ResidentCprField({ residentId }: { residentId: string }) {
  const [state, setState] = useState<'loading' | 'hidden' | 'ready'>('loading');
  const [masked, setMasked] = useState<string | null>(null);
  const [full, setFull] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return setState('hidden');
    const [m, p] = await Promise.all([
      supabase.rpc('get_resident_cpr_masked', { p_resident_id: residentId }),
      supabase.rpc('care_staff_has_permission', { p_permission: 'manage_residents' }),
    ]);
    if (m.error) return setState('hidden');
    setMasked((m.data as string | null) ?? null);
    setCanEdit(p.data === true);
    setState('ready');
  }, [residentId]);

  useEffect(() => {
    void load();
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [load]);

  const hide = () => {
    setFull(null);
    if (timer.current) window.clearTimeout(timer.current);
  };

  const reveal = async () => {
    const supabase = createClient();
    if (!supabase || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('reveal_resident_cpr', {
      p_resident_id: residentId,
    });
    setBusy(false);
    if (error || typeof data !== 'string') {
      toast.error('CPR-nummeret kunne ikke hentes.');
      return;
    }
    setFull(data);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFull(null), REVEAL_MS);
  };

  const copy = () => {
    if (!full) return;
    void navigator.clipboard
      .writeText(full.replace('-', ''))
      .then(() => toast.success('CPR-nummeret er kopieret'))
      .catch(() => toast.error('Kunne ikke kopiere'));
  };

  const save = async () => {
    if (draft.trim() && !isValidCpr(draft)) {
      toast.error('Skriv et CPR-nummer med 10 cifre, fx 010190-1234.');
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc('set_resident_cpr', {
      p_resident_id: residentId,
      p_cpr: draft,
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.code === '42501' ? 'Kun en leder kan ændre CPR-nummeret.' : 'Det blev ikke gemt.'
      );
      return;
    }
    toast.success(draft.trim() ? 'CPR-nummeret er gemt' : 'CPR-nummeret er slettet');
    setEditing(false);
    hide();
    void load();
  };

  if (state !== 'ready') return null;

  const btn =
    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50';
  const btnStyle = { borderColor: 'var(--cp-border)', color: 'var(--cp-text)' };

  if (editing) {
    return (
      <form
        className="mt-1.5 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label htmlFor="cpr-input" className="text-sm" style={{ color: 'var(--cp-muted)' }}>
          CPR
        </label>
        <input
          id="cpr-input"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(formatCpr(e.target.value))}
          placeholder="ddmmåå-xxxx"
          className="w-36 rounded-md border px-2 py-1 font-mono text-sm"
          style={{
            borderColor: 'var(--cp-border)',
            backgroundColor: 'var(--cp-bg)',
            color: 'var(--cp-text)',
          }}
        />
        <button type="submit" disabled={busy} className={btn} style={btnStyle}>
          Gem
        </button>
        <button type="button" onClick={() => setEditing(false)} className={btn} style={btnStyle}>
          Annullér
        </button>
      </form>
    );
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
      <span style={{ color: 'var(--cp-muted)' }}>CPR</span>
      {masked ? (
        <>
          <span className="font-mono tabular-nums" style={{ color: 'var(--cp-text)' }}>
            {full ?? masked}
          </span>
          {full ? (
            <>
              <button type="button" onClick={copy} className={btn} style={btnStyle}>
                <Copy className="h-3 w-3" aria-hidden /> Kopiér
              </button>
              <button type="button" onClick={hide} className={btn} style={btnStyle}>
                <EyeOff className="h-3 w-3" aria-hidden /> Skjul
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void reveal()}
              disabled={busy}
              className={btn}
              style={btnStyle}
              title="Visningen bliver logget"
            >
              <Eye className="h-3 w-3" aria-hidden /> Vis
            </button>
          )}
        </>
      ) : (
        <span style={{ color: 'var(--cp-muted)' }}>ikke registreret</span>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={() => {
            setDraft(full ?? '');
            setEditing(true);
          }}
          className={btn}
          style={btnStyle}
        >
          <Pencil className="h-3 w-3" aria-hidden /> {masked ? 'Ret' : 'Tilføj'}
        </button>
      )}
    </div>
  );
}

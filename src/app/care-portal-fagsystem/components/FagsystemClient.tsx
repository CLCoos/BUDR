'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ClipboardCopy, Loader2, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cardStyle, ghostButton, primaryButton } from '@/components/documents/shared';
import { residentFullName, residentLabel, type ResidentNameRow } from '@/lib/assistant/names';
import ResidentInitials from '@/components/residents/ResidentInitials';
import {
  fagsystemDateTime,
  formatNoteForFagsystem,
  formatNotesForFagsystem,
  groupNotesByResident,
  noteHeader,
  type FagsystemNote,
  type FagsystemTransfer,
} from '@/lib/fagsystem/format';
import {
  copyText,
  loadTransfers,
  markTransferred,
  readHeaderPref,
  undoTransferred,
  writeHeaderPref,
} from '@/lib/fagsystem/client';

type Filter = 'mangler' | 'overfoert' | 'alle';
type NoteRow = FagsystemNote & { staff_id: string | null };
type Me = { id: string; orgId: string; name: string };

const DAYS = 14;

const FILTER_LABELS: Record<Filter, string> = {
  mangler: 'Mangler',
  overfoert: 'Overført',
  alle: 'Alle',
};

export default function FagsystemClient() {
  const searchParams = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [fullNames, setFullNames] = useState<Record<string, string>>({});
  const [transfers, setTransfers] = useState<Map<string, FagsystemTransfer>>(new Map());
  const [tracking, setTracking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('mangler');
  const [onlyMine, setOnlyMine] = useState(searchParams.get('mine') === '1');
  const [withHeader, setWithHeader] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState<string | null>(null);

  useEffect(() => setWithHeader(readHeaderPref()), []);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError('Kunne ikke oprette forbindelse');
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Log ind for at se notaterne');
      setLoading(false);
      return;
    }
    const { data: staff } = await supabase
      .from('care_staff')
      .select('org_id, full_name')
      .eq('id', user.id)
      .maybeSingle();
    if (!staff?.org_id) {
      setError('Din bruger er ikke knyttet til et bosted');
      setLoading(false);
      return;
    }
    setMe({ id: user.id, orgId: staff.org_id as string, name: (staff.full_name as string) || '' });

    const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
    const [notesRes, residentsRes] = await Promise.all([
      supabase
        .from('journal_entries')
        .select('id, resident_id, staff_id, staff_name, entry_text, category, created_at')
        .eq('org_id', staff.org_id)
        .neq('journal_status', 'kladde')
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(500),
      supabase
        .from('care_residents')
        .select('user_id, first_name, last_name, display_name, nickname')
        .eq('org_id', staff.org_id),
    ]);
    if (notesRes.error) {
      setError('Kunne ikke hente journalnotater');
      setLoading(false);
      return;
    }
    const list = (notesRes.data ?? []) as NoteRow[];
    setNotes(list);
    const residentRows = (residentsRes.data ?? []) as ResidentNameRow[];
    setNames(Object.fromEntries(residentRows.map((r) => [r.user_id, residentLabel(r)])));
    setFullNames(Object.fromEntries(residentRows.map((r) => [r.user_id, residentFullName(r)])));
    const t = await loadTransfers(
      supabase,
      list.map((n) => n.id)
    );
    setTransfers(t.map);
    setTracking(t.available);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () =>
      notes.filter((n) => {
        if (onlyMine && me && n.staff_id !== me.id) return false;
        const done = transfers.has(n.id);
        if (filter === 'mangler') return !done;
        if (filter === 'overfoert') return done;
        return true;
      }),
    [notes, transfers, filter, onlyMine, me]
  );
  const missingCount = useMemo(
    () => notes.filter((n) => !transfers.has(n.id) && (!onlyMine || n.staff_id === me?.id)).length,
    [notes, transfers, onlyMine, me]
  );
  const groups = useMemo(
    () => groupNotesByResident(visible, (id) => names[id] ?? 'Borger'),
    [visible, names]
  );

  const copyAndMark = async (key: string, list: FagsystemNote[]) => {
    const text =
      list.length === 1
        ? formatNoteForFagsystem(list[0]!, withHeader)
        : formatNotesForFagsystem(list, withHeader);
    // Kopiér først, mens klikket stadig tæller som brugerhandling i browseren.
    const copied = await copyText(text);
    if (!copied) {
      toast.error('Kunne ikke kopiere. Markér teksten og kopiér den selv.');
      return;
    }
    setJustCopied(key);
    setTimeout(() => setJustCopied((k) => (k === key ? null : k)), 2500);

    const fresh = list.filter((n) => !transfers.has(n.id));
    if (!tracking || !me || fresh.length === 0) {
      toast.success('Kopieret. Sæt teksten ind i fagsystemet.');
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setBusy(key);
    const res = await markTransferred(supabase, {
      orgId: me.orgId,
      staffId: me.id,
      staffName: me.name,
      notes: fresh,
    });
    setBusy(null);
    if (!res.ok) {
      toast.error('Kopieret, men kunne ikke markere som overført. Prøv igen.');
      return;
    }
    setTransfers((prev) => {
      const next = new Map(prev);
      for (const r of res.rows) next.set(r.journal_entry_id, r);
      return next;
    });
    const ids = res.rows.map((r) => r.journal_entry_id);
    toast.success(
      `Kopieret og markeret som overført (${ids.length} ${ids.length === 1 ? 'notat' : 'notater'}). Sæt teksten ind i fagsystemet.`,
      {
        duration: 8000,
        action: {
          label: 'Fortryd',
          onClick: () => {
            void (async () => {
              const ok = await undoTransferred(supabase, ids);
              if (!ok) {
                toast.error('Kunne ikke fortryde');
                return;
              }
              setTransfers((prev) => {
                const next = new Map(prev);
                for (const id of ids) next.delete(id);
                return next;
              });
            })();
          },
        },
      }
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold sm:text-2xl" style={{ color: 'var(--cp-text)' }}>
          Overfør til fagsystem
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
          Her er de godkendte journalnotater fra de seneste {DAYS} dage. Tryk{' '}
          <strong>Kopiér</strong>, og sæt teksten ind i jeres fagsystem (fx Sensum eller Nexus) med
          Ctrl+V. BUDR husker, hvad der er overført, så I ikke glemmer noget eller tager det to
          gange.
        </p>
      </header>

      {!tracking && (
        <p
          className="rounded-xl border p-3 text-sm"
          style={{ ...cardStyle, color: 'var(--cp-amber)' }}
        >
          Kopiering virker, men BUDR kan endnu ikke huske, hvad der er overført.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Vis notater"
          className="flex gap-1 rounded-xl border p-1"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
        >
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className="min-h-[40px] rounded-lg px-3 text-sm font-medium"
              style={{
                backgroundColor: filter === f ? 'var(--cp-bg2)' : 'transparent',
                color: filter === f ? 'var(--cp-text)' : 'var(--cp-muted)',
              }}
            >
              {FILTER_LABELS[f]}
              {f === 'mangler' && !loading ? ` (${missingCount})` : ''}
            </button>
          ))}
        </div>
        <label
          className="flex min-h-[40px] items-center gap-2 px-1 text-sm"
          style={{ color: 'var(--cp-text)' }}
        >
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
          />
          Kun mine notater
        </label>
        <label
          className="flex min-h-[40px] items-center gap-2 px-1 text-sm"
          style={{ color: 'var(--cp-text)' }}
        >
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={withHeader}
            onChange={(e) => {
              setWithHeader(e.target.checked);
              writeHeaderPref(e.target.checked);
            }}
          />
          Medtag dato og forfatter
        </label>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className={`${ghostButton} ml-auto`}
          style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
        >
          <RefreshCw size={14} aria-hidden /> Opdater
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10" style={{ color: 'var(--cp-muted)' }}>
          <Loader2 size={18} className="animate-spin" aria-hidden /> Henter notater…
        </div>
      ) : error ? (
        <p className="text-sm" style={{ color: 'var(--cp-amber)' }}>
          {error}
        </p>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center" style={cardStyle}>
          <Check size={28} className="mx-auto mb-2" style={{ color: 'var(--cp-green)' }} />
          <p className="text-sm" style={{ color: 'var(--cp-text)' }}>
            {filter === 'mangler'
              ? 'Alt er overført. Godt gået.'
              : 'Ingen notater at vise i perioden.'}
          </p>
        </div>
      ) : (
        groups.map((g) => {
          const groupKey = `g:${g.residentId}`;
          const missing = g.notes.filter((n) => !transfers.has(n.id));
          return (
            <section key={g.residentId} className="rounded-2xl border" style={cardStyle}>
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
                style={{ borderColor: 'var(--cp-border)' }}
              >
                <div className="min-w-0">
                  <ResidentInitials
                    initials={g.name}
                    fullName={fullNames[g.residentId]}
                    href={`/resident-360-view/${g.residentId}`}
                    className="text-base font-semibold"
                    style={{ color: 'var(--cp-text)' }}
                  />
                  <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    {g.notes.length} {g.notes.length === 1 ? 'notat' : 'notater'}
                    {missing.length > 0 && missing.length < g.notes.length
                      ? `, ${missing.length} mangler`
                      : ''}
                  </p>
                </div>
                {g.notes.length > 1 && (
                  <button
                    type="button"
                    disabled={busy === groupKey}
                    onClick={() =>
                      void copyAndMark(groupKey, missing.length > 0 ? missing : g.notes)
                    }
                    className={primaryButton}
                    style={{ backgroundColor: 'var(--cp-green)' }}
                  >
                    {justCopied === groupKey ? (
                      <Check size={15} aria-hidden />
                    ) : (
                      <ClipboardCopy size={15} aria-hidden />
                    )}
                    {justCopied === groupKey
                      ? 'Kopieret'
                      : missing.length > 0
                        ? `Kopiér ${missing.length === g.notes.length ? 'alle' : 'de manglende'} (${missing.length})`
                        : `Kopiér alle igen (${g.notes.length})`}
                  </button>
                )}
              </div>
              <ul className="divide-y" style={{ borderColor: 'var(--cp-border)' }}>
                {g.notes.map((n) => {
                  const t = transfers.get(n.id);
                  const key = `n:${n.id}`;
                  return (
                    <li
                      key={n.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start"
                      style={{ borderColor: 'var(--cp-border)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                          {noteHeader(n)}
                        </p>
                        <p
                          className="mt-1 whitespace-pre-wrap text-sm leading-relaxed"
                          style={{ color: 'var(--cp-text)' }}
                        >
                          {n.entry_text}
                        </p>
                        {t && (
                          <p
                            className="mt-1 inline-flex items-center gap-1 text-xs"
                            style={{ color: 'var(--cp-green)' }}
                          >
                            <Check size={12} aria-hidden />
                            Overført {fagsystemDateTime(t.transferred_at)}
                            {t.transferred_by_name ? ` af ${t.transferred_by_name}` : ''}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={busy === key}
                        onClick={() => void copyAndMark(key, [n])}
                        className={t ? ghostButton : primaryButton}
                        style={
                          t
                            ? { borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }
                            : { backgroundColor: 'var(--cp-green)' }
                        }
                      >
                        {justCopied === key ? (
                          <Check size={15} aria-hidden />
                        ) : (
                          <ClipboardCopy size={15} aria-hidden />
                        )}
                        {justCopied === key ? 'Kopieret' : t ? 'Kopiér igen' : 'Kopiér'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

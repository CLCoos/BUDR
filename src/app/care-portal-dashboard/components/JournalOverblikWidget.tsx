'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle2, FilePenLine, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';

type JournalRow = {
  id: string;
  resident_id: string;
  staff_name: string;
  entry_text: string;
  category: string;
  created_at: string;
  journal_status: string | null;
};

function missingJournalStatusColumn(errorMessage?: string) {
  if (!errorMessage) return false;
  const msg = errorMessage.toLowerCase();
  return msg.includes('journal_status') && msg.includes('does not exist');
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const t = d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `I dag ${t}`;
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) + ` · ${t}`;
}

function isDraft(row: JournalRow) {
  return row.journal_status === 'kladde';
}

export default function JournalOverblikWidget() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [nameByResident, setNameByResident] = useState<Record<string, string>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [hasJournalStatusColumn, setHasJournalStatusColumn] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setScopeError('Kunne ikke oprette forbindelse');
      setLoading(false);
      return;
    }

    const {
      orgId,
      residentIds,
      error: orgErr,
      queryMessage,
    } = await resolveStaffOrgResidents(supabase);
    if (orgErr || !orgId || residentIds.length === 0) {
      setScopeError(
        orgErr === 'no_org'
          ? 'Organisation mangler på din bruger — kontakt administrator'
          : orgErr === 'no_session'
            ? 'Log ind for at se journal'
            : (queryMessage ?? 'Kunne ikke hente beboere')
      );
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setScopeError(null);
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    let list: JournalRow[] = [];
    const { data: journalData, error: jErr } = await supabase
      .from('journal_entries')
      .select('id, resident_id, staff_name, entry_text, category, created_at, journal_status')
      .in('resident_id', residentIds)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(45);

    if (jErr && missingJournalStatusColumn(jErr.message)) {
      const { data: fallbackData, error: fallbackErr } = await supabase
        .from('journal_entries')
        .select('id, resident_id, staff_name, entry_text, category, created_at')
        .in('resident_id', residentIds)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(45);
      if (fallbackErr) {
        setScopeError(fallbackErr.message);
        setRows([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setHasJournalStatusColumn(false);
      list = ((fallbackData ?? []) as Omit<JournalRow, 'journal_status'>[]).map((row) => ({
        ...row,
        journal_status: null,
      }));
    } else if (jErr) {
      setScopeError(jErr.message);
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    } else {
      setHasJournalStatusColumn(true);
      list = (journalData ?? []) as JournalRow[];
    }

    setRows(list);

    const ids = [...new Set(list.map((r) => r.resident_id))];
    if (ids.length > 0) {
      const { data: resData } = await supabase
        .from('care_residents')
        .select('user_id, display_name')
        .in('user_id', ids);
      setNameByResident(
        Object.fromEntries(
          (resData ?? []).map((r: { user_id: string; display_name: string }) => [
            r.user_id,
            r.display_name,
          ])
        )
      );
    } else {
      setNameByResident({});
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onJournalUpdated = () => {
      setRefreshing(true);
      void load();
    };
    window.addEventListener('portal-journal-updated', onJournalUpdated);
    return () => window.removeEventListener('portal-journal-updated', onJournalUpdated);
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const drafts = rows.filter(isDraft);
  const godkendt = rows.filter((r) => !isDraft(r));

  const approveDraft = useCallback(
    async (id: string, residentId: string) => {
      const supabase = createClient();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error('Du skal være logget ind');
        return;
      }
      setApprovingId(id);
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('journal_entries')
        .update({
          journal_status: 'godkendt',
          approved_at: nowIso,
          approved_by: user.id,
        })
        .eq('id', id)
        .eq('resident_id', residentId)
        .eq('journal_status', 'kladde');
      setApprovingId(null);
      if (error) {
        toast.error('Kunne ikke godkende notat');
        return;
      }
      toast.success('Journal godkendt');
      void load();
    },
    [load]
  );

  return (
    <section className="cp-card-elevated w-full p-5" aria-label="Journal overblik">
      <div
        className="mb-4 flex items-start justify-between gap-3 pb-4"
        style={{ borderBottom: '1px solid var(--cp-border)' }}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <BookOpen
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: 'var(--cp-blue)' }}
            aria-hidden
          />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
              Journal (7 dage)
            </h2>
            <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              Kladder og godkendte journalnotater — bekymringsnotater (hurtige obs.) ligger i widget
              ved siden af
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading || refreshing}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          style={{
            borderColor: 'var(--cp-border)',
            color: 'var(--cp-muted)',
            backgroundColor: 'transparent',
          }}
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          )}
          Opdater
        </button>
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center gap-2 py-10"
          style={{ color: 'var(--cp-muted)' }}
        >
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span className="text-sm">Henter journal…</span>
        </div>
      ) : scopeError ? (
        <p className="text-sm" style={{ color: 'var(--cp-amber)' }}>
          {scopeError}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
          Ingen journalnotater i de seneste 7 dage.
        </p>
      ) : (
        <div className="space-y-5">
          {hasJournalStatusColumn && drafts.length > 0 && (
            <div>
              <div
                className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-amber)' }}
              >
                <FilePenLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Kladder ({drafts.length})
              </div>
              <ul className="space-y-2">
                {drafts.slice(0, 6).map((j) => (
                  <li
                    key={j.id}
                    className="rounded-lg border border-dashed p-3"
                    style={{
                      borderColor: 'rgba(245, 158, 11, 0.45)',
                      backgroundColor: 'var(--cp-amber-dim)',
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                      <span style={{ color: 'var(--cp-text)' }} className="font-medium">
                        {nameByResident[j.resident_id] ?? 'Beboer'}
                      </span>
                      <span style={{ color: 'var(--cp-muted)' }}>{fmtTime(j.created_at)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {j.entry_text}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={approvingId === j.id}
                        onClick={() => void approveDraft(j.id, j.resident_id)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-opacity disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--cp-amber)',
                          color: '#0c1118',
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3" aria-hidden />
                        {approvingId === j.id ? 'Godkender…' : 'Godkend'}
                      </button>
                      <Link
                        href={`/resident-360-view/${j.resident_id}?tab=overblik`}
                        className="text-[11px] font-medium underline-offset-2 hover:underline"
                        style={{ color: 'var(--cp-green)' }}
                      >
                        Åbn 360°
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div
              className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--cp-muted)' }}
            >
              Godkendt journal
            </div>
            {godkendt.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                Ingen godkendte notater i perioden.
              </p>
            ) : (
              <ul className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {godkendt.slice(0, 12).map((j) => (
                  <li
                    key={j.id}
                    className="rounded-lg border px-3 py-2"
                    style={{
                      borderColor: 'var(--cp-border)',
                      backgroundColor: 'var(--cp-bg3)',
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                      <Link
                        href={`/resident-360-view/${j.resident_id}?tab=overblik`}
                        className="font-medium hover:underline"
                        style={{ color: 'var(--cp-text)' }}
                      >
                        {nameByResident[j.resident_id] ?? 'Beboer'}
                      </Link>
                      <span style={{ color: 'var(--cp-muted)' }}>{fmtTime(j.created_at)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {j.entry_text}
                    </p>
                    <div
                      className="mt-1 flex flex-wrap gap-2 text-[10px]"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      <span>{j.staff_name}</span>
                      {j.category ? <span>· {j.category}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

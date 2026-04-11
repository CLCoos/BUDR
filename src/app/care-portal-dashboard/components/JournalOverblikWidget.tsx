'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  FilePenLine,
  FileEdit,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const miniStatCard: React.CSSProperties = {
  background: 'var(--cp-bg2)',
  border: '1px solid var(--cp-border)',
  borderRadius: '12px',
  padding: '14px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  boxShadow: 'var(--cp-card-shadow)',
};

const statLabel: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--cp-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const sectionHeader: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--cp-muted)',
  padding: '0 0 10px 0',
  borderBottom: '1px solid var(--cp-border)',
  marginBottom: '12px',
};

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
      {/* ── Widget-header ───────────────────────────────────── */}
      <div
        className="mb-5 flex items-start justify-between gap-3 pb-4"
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
      ) : (
        <>
          {/* ── Stat-bar ─────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={miniStatCard}>
              <BookOpen size={20} strokeWidth={1.5} style={{ color: 'var(--cp-muted)' }} />
              <div>
                <div
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 300,
                    color: 'var(--cp-text)',
                    lineHeight: 1,
                  }}
                >
                  {godkendt.length}
                </div>
                <div style={statLabel}>Godkendte notater</div>
              </div>
            </div>
            <div style={miniStatCard}>
              <FileEdit size={20} strokeWidth={1.5} style={{ color: 'var(--cp-amber)' }} />
              <div>
                <div
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 300,
                    color: 'var(--cp-amber)',
                    lineHeight: 1,
                  }}
                >
                  {drafts.length}
                </div>
                <div style={statLabel}>Kladder</div>
              </div>
            </div>
            <div style={miniStatCard}>
              <Clock size={20} strokeWidth={1.5} style={{ color: 'var(--cp-muted)' }} />
              <div>
                <div
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 300,
                    color: 'var(--cp-muted)',
                    lineHeight: 1,
                  }}
                >
                  7
                </div>
                <div style={statLabel}>Dages periode</div>
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            /* ── Tom-state ─────────────────────────────────── */
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--cp-muted)' }}>
              <BookOpen size={32} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ fontSize: '0.875rem' }}>Ingen journalnotater i de seneste 7 dage</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── Sektion A: Kladder ────────────────────── */}
              {hasJournalStatusColumn && (
                <div>
                  <div
                    style={{ ...sectionHeader, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <FilePenLine size={12} aria-hidden />
                    Kladder {drafts.length > 0 && `(${drafts.length})`}
                  </div>
                  {drafts.length === 0 ? (
                    <p
                      style={{
                        fontSize: '0.8rem',
                        fontStyle: 'italic',
                        color: 'var(--cp-muted)',
                        padding: '8px 0',
                      }}
                    >
                      Ingen kladder
                    </p>
                  ) : (
                    <div>
                      {drafts.slice(0, 6).map((j) => {
                        const resName = nameByResident[j.resident_id] ?? 'Beboer';
                        const initials = getInitials(resName);
                        return (
                          <NoteCard
                            key={j.id}
                            j={j}
                            resName={resName}
                            initials={initials}
                            isDraftCard
                            approvingId={approvingId}
                            onApprove={() => void approveDraft(j.id, j.resident_id)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Sektion B: Godkendt journal ───────────── */}
              <div>
                <div style={sectionHeader}>Godkendt journal</div>
                {godkendt.length === 0 ? (
                  <p
                    style={{
                      fontSize: '0.8rem',
                      fontStyle: 'italic',
                      color: 'var(--cp-muted)',
                      padding: '8px 0',
                    }}
                  >
                    Ingen godkendte notater i perioden.
                  </p>
                ) : (
                  <div>
                    {godkendt.slice(0, 12).map((j) => {
                      const resName = nameByResident[j.resident_id] ?? 'Beboer';
                      const initials = getInitials(resName);
                      return (
                        <NoteCard
                          key={j.id}
                          j={j}
                          resName={resName}
                          initials={initials}
                          isDraftCard={false}
                          approvingId={approvingId}
                          onApprove={() => {}}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

type NoteCardProps = {
  j: JournalRow;
  resName: string;
  initials: string;
  isDraftCard: boolean;
  approvingId: string | null;
  onApprove: () => void;
};

function NoteCard({ j, resName, initials, isDraftCard, approvingId, onApprove }: NoteCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: isDraftCard ? 'var(--cp-amber-dim)' : 'var(--cp-bg2)',
        border: isDraftCard
          ? `1px dashed ${hovered ? 'rgba(245,158,11,0.7)' : 'rgba(245,158,11,0.45)'}`
          : `1px solid ${hovered ? 'var(--cp-border2)' : 'var(--cp-border)'}`,
        borderRadius: '10px',
        padding: '14px 16px',
        marginBottom: '8px',
        boxShadow: 'var(--cp-card-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Række 1: Avatar + navn / dato */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--cp-bg3)',
              color: 'var(--cp-muted)',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <Link
            href={`/resident-360-view/${j.resident_id}?tab=overblik`}
            style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--cp-text)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {resName}
          </Link>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--cp-muted)' }}>
          {fmtTime(j.created_at)}
        </span>
      </div>

      {/* Række 2: Notat-tekst */}
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--cp-text)',
          lineHeight: 1.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          margin: 0,
        }}
      >
        {j.entry_text}
      </p>

      {/* Række 3: Badge + forfatter + godkend-knap */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {j.category && (
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: '20px',
              background: 'var(--cp-bg3)',
              color: 'var(--cp-muted)',
            }}
          >
            {j.category}
          </span>
        )}
        <span style={{ fontSize: '0.75rem', color: 'var(--cp-muted2)' }}>{j.staff_name}</span>
        {isDraftCard && (
          <button
            type="button"
            disabled={approvingId === j.id}
            onClick={(e) => {
              e.stopPropagation();
              onApprove();
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--cp-amber)', color: '#0c1118', marginLeft: 'auto' }}
          >
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            {approvingId === j.id ? 'Godkender…' : 'Godkend'}
          </button>
        )}
      </div>
    </div>
  );
}

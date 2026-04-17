'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';

const CATEGORIES = [
  'Trivsel',
  'Økonomi',
  'Relationer',
  'Helbred',
  'Misbrug',
  'Adfærd',
  'Bolig',
  'Andet',
] as const;
export type BekymringsCategory = (typeof CATEGORIES)[number];

export interface Bekymringsnotat {
  id: string;
  residentId: string;
  residentName: string;
  note: string;
  category: BekymringsCategory;
  severity: number;
  createdAt: Date;
  staffInitials: string;
}

const DEMO_RESIDENTS: { id: string; name: string }[] = [
  { id: 'res-001', name: 'Anders M.' },
  { id: 'res-002', name: 'Finn L.' },
  { id: 'res-003', name: 'Kirsten R.' },
  { id: 'res-004', name: 'Maja T.' },
  { id: 'res-005', name: 'Thomas B.' },
  { id: 'res-006', name: 'Lena P.' },
  { id: 'res-007', name: 'Henrik S.' },
  { id: 'res-008', name: 'Birgit N.' },
  { id: 'res-009', name: 'Rasmus V.' },
  { id: 'res-010', name: 'Dorthe A.' },
];

function severityTone(score: number): 'green' | 'amber' | 'red' {
  if (score <= 3) return 'green';
  if (score <= 6) return 'amber';
  return 'red';
}

function severityStyle(tone: 'green' | 'amber' | 'red'): React.CSSProperties {
  if (tone === 'green') return { backgroundColor: 'var(--cp-green)', color: '#fff' };
  if (tone === 'amber') return { backgroundColor: 'var(--cp-amber)', color: '#fff' };
  return { backgroundColor: 'var(--cp-red)', color: '#fff' };
}

function formatNoteDate(d: Date): string {
  return d.toLocaleDateString('da-DK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createInitialMockNotes(): Bekymringsnotat[] {
  const now = Date.now();
  return [
    {
      id: 'bn-001',
      residentId: 'res-002',
      residentName: 'Finn L.',
      note: 'Virker isoleret siden besøg fra pårørende blev aflyst i sidste uge.',
      category: 'Relationer',
      severity: 6,
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      staffInitials: 'SK',
    },
    {
      id: 'bn-002',
      residentId: 'res-005',
      residentName: 'Thomas B.',
      note: 'Mangler kontant til småting — skal afklares med socialrådgiver.',
      category: 'Økonomi',
      severity: 4,
      createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
      staffInitials: 'SK',
    },
    {
      id: 'bn-003',
      residentId: 'res-003',
      residentName: 'Kirsten R.',
      note: 'Søvn og appetit stadig lav; læge er underrettet.',
      category: 'Helbred',
      severity: 8,
      createdAt: new Date(now - 6 * 60 * 60 * 1000),
      staffInitials: 'SK',
    },
  ];
}

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--cp-bg3)',
  border: '1px solid var(--cp-border2)',
  color: 'var(--cp-text)',
  borderRadius: 8,
  width: '100%',
  padding: '0.625rem 0.75rem',
  fontSize: '0.875rem',
  outline: 'none',
  colorScheme: 'dark',
};

async function staffAuthorLabel(): Promise<string> {
  const supabase = createClient();
  if (!supabase) return '';
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return '';
  const meta = user.user_metadata as { full_name?: string; initials?: string } | undefined;
  if (typeof meta?.initials === 'string' && meta.initials.trim())
    return meta.initials.trim().slice(0, 6);
  if (typeof meta?.full_name === 'string' && meta.full_name.trim()) {
    const parts = meta.full_name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
    return meta.full_name.trim().slice(0, 3).toUpperCase();
  }
  const email = user.email?.split('@')[0] ?? '';
  return email.slice(0, 3).toUpperCase() || '?';
}

type Props = {
  /** Demo-dashboard: simulerede beboere og data (ingen Supabase). */
  demoMode?: boolean;
};

export default function BekymringsnotatWidget({ demoMode = false }: Props) {
  const [notes, setNotes] = useState<Bekymringsnotat[]>(() =>
    demoMode ? createInitialMockNotes() : []
  );
  const [loading, setLoading] = useState(!demoMode);
  const [refreshing, setRefreshing] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [residents, setResidents] = useState<{ id: string; name: string }[]>(() =>
    demoMode ? DEMO_RESIDENTS : []
  );
  const [showForm, setShowForm] = useState(false);
  const [residentId, setResidentId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [category, setCategory] = useState<BekymringsCategory | ''>('');
  const [severity, setSeverity] = useState(5);
  const [saving, setSaving] = useState(false);

  const maxNoteLen = demoMode ? 120 : 500;

  const loadLive = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setScopeError('Kunne ikke oprette forbindelse');
      setNotes([]);
      setResidents([]);
      setLoading(false);
      setRefreshing(false);
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
            ? 'Log ind for at se bekymringsnotater'
            : (queryMessage ?? 'Kunne ikke hente beboere')
      );
      setNotes([]);
      setResidents([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setScopeError(null);

    const { data: resRows, error: resErr } = await supabase
      .from('care_residents')
      .select('user_id, display_name')
      .eq('org_id', orgId)
      .order('display_name');

    if (resErr) {
      setScopeError(resErr.message);
      setNotes([]);
      setResidents([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const resList = (resRows ?? []) as { user_id: string; display_name: string }[];
    setResidents(resList.map((r) => ({ id: r.user_id, name: r.display_name })));

    const { data: noteRows, error: nErr } = await supabase
      .from('care_concern_notes')
      .select('id, resident_id, note, category, severity, staff_name, created_at')
      .in('resident_id', residentIds)
      .order('created_at', { ascending: false })
      .limit(40);

    if (nErr) {
      setScopeError(
        nErr.message.includes('care_concern_notes')
          ? `${nErr.message} — kør seneste Supabase-migration (care_concern_notes).`
          : nErr.message
      );
      setNotes([]);
    } else {
      const nameBy = Object.fromEntries(resList.map((r) => [r.user_id, r.display_name]));
      const mapped: Bekymringsnotat[] = (noteRows ?? []).map(
        (row: {
          id: string;
          resident_id: string;
          note: string;
          category: string;
          severity: number;
          staff_name: string;
          created_at: string;
        }) => ({
          id: row.id,
          residentId: row.resident_id,
          residentName: nameBy[row.resident_id] ?? 'Beboer',
          note: row.note,
          category: row.category as BekymringsCategory,
          severity: row.severity,
          createdAt: new Date(row.created_at),
          staffInitials: row.staff_name?.trim().slice(0, 6) || '—',
        })
      );
      setNotes(mapped);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!demoMode) void loadLive();
  }, [demoMode, loadLive]);

  const refresh = useCallback(() => {
    if (demoMode) return;
    setRefreshing(true);
    void loadLive();
  }, [demoMode, loadLive]);

  const displayedNotes = useMemo(
    () => [...notes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5),
    [notes]
  );

  const sliderTone = severityTone(severity);

  const removeNote = useCallback(
    async (id: string) => {
      if (demoMode) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        return;
      }
      const supabase = createClient();
      if (!supabase) return;
      const { error } = await supabase.from('care_concern_notes').delete().eq('id', id);
      if (error) {
        toast.error('Kunne ikke fjerne notat');
        return;
      }
      toast.success('Notat fjernet');
      void loadLive();
    },
    [demoMode, loadLive]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!residentId || !category || !noteText.trim()) return;

      if (demoMode) {
        const res = DEMO_RESIDENTS.find((r) => r.id === residentId);
        if (!res) return;
        setNotes((prev) => [
          {
            id: `bn-${Date.now()}`,
            residentId,
            residentName: res.name,
            note: noteText.trim().slice(0, maxNoteLen),
            category: category as BekymringsCategory,
            severity,
            createdAt: new Date(),
            staffInitials: 'SK',
          },
          ...prev,
        ]);
        setNoteText('');
        setCategory('');
        setResidentId('');
        setSeverity(5);
        setShowForm(false);
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        toast.error('Ingen forbindelse');
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error('Du skal være logget ind');
        return;
      }

      setSaving(true);
      const author = await staffAuthorLabel();
      const { data: staffOrgRow } = await supabase
        .from('care_staff')
        .select('org_id')
        .eq('id', user.id)
        .maybeSingle();
      const { error } = await supabase.from('care_concern_notes').insert({
        resident_id: residentId,
        note: noteText.trim().slice(0, maxNoteLen),
        category,
        severity,
        staff_name: author,
        created_by: user.id,
        org_id: (staffOrgRow as { org_id?: string } | null)?.org_id ?? null,
      });
      setSaving(false);
      if (error) {
        toast.error(
          error.message.includes('care_concern_notes')
            ? 'Databasen mangler tabellen — kør migration care_concern_notes'
            : 'Kunne ikke gemme notat'
        );
        return;
      }
      toast.success('Bekymringsnotat gemt');
      setNoteText('');
      setCategory('');
      setResidentId('');
      setSeverity(5);
      setShowForm(false);
      void loadLive();
    },
    [residentId, category, noteText, severity, demoMode, maxNoteLen, loadLive]
  );

  return (
    <section className="cp-card-elevated w-full p-5" aria-label="Bekymringsnotater">
      <div
        className="mb-4 flex items-start justify-between gap-3 pb-4"
        style={{ borderBottom: '1px solid var(--cp-border)' }}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: 'var(--cp-amber)' }}
            aria-hidden
          />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
              Bekymringsnotater
            </h2>
            <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              Hurtige observationer · synlige på 360° overblik · ikke det samme som godkendt journal
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!demoMode && (
            <button
              type="button"
              onClick={refresh}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                borderColor: 'var(--cp-border)',
                color: 'var(--cp-muted)',
                backgroundColor: 'transparent',
              }}
              aria-label="Opdater liste"
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            aria-expanded={showForm}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: 'var(--cp-green)' }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Tilføj
          </button>
        </div>
      </div>

      <div
        className={`grid transition-all duration-200 ease-out ${showForm ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mb-4 space-y-4 rounded-xl p-4"
            style={{ backgroundColor: 'var(--cp-bg3)', border: '1px solid var(--cp-border)' }}
          >
            <div className="relative">
              <label htmlFor="bek-resident" className="sr-only">
                Beboer
              </label>
              <select
                id="bek-resident"
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                style={{ ...INPUT_STYLE, paddingRight: '2.5rem', appearance: 'none' }}
              >
                <option value="">Vælg beboer</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: 'var(--cp-muted2)' }}
                aria-hidden
              />
            </div>

            <div>
              <label htmlFor="bek-note" className="sr-only">
                Beskrivelse
              </label>
              {demoMode ? (
                <input
                  id="bek-note"
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  maxLength={maxNoteLen}
                  placeholder="Beskriv bekymringen kort..."
                  style={{ ...INPUT_STYLE }}
                />
              ) : (
                <textarea
                  id="bek-note"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  maxLength={maxNoteLen}
                  rows={3}
                  placeholder="Beskriv observationen…"
                  style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: '4.5rem' }}
                />
              )}
              <div className="mt-1 text-right text-xs" style={{ color: 'var(--cp-muted2)' }}>
                {noteText.length}/{maxNoteLen}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>
                Kategori
              </p>
              <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map((cat) => {
                  const selected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200"
                      style={
                        selected
                          ? { backgroundColor: 'var(--cp-green)', color: '#fff' }
                          : {
                              backgroundColor: 'var(--cp-bg3)',
                              border: '1px solid var(--cp-border2)',
                              color: 'var(--cp-muted)',
                            }
                      }
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>
                  Alvor (1–10)
                </span>
                <span
                  className="inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold"
                  style={severityStyle(sliderTone)}
                >
                  {severity}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-green-400 via-amber-400 to-red-500
                  [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-[var(--cp-bg2)] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm
                  [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--cp-bg2)]
                  [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--cp-green)' }}
            >
              {saving ? 'Gemmer…' : 'Gem bekymring'}
            </button>
          </form>
        </div>
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center gap-2 py-10"
          style={{ color: 'var(--cp-muted)' }}
        >
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span className="text-sm">Henter notater…</span>
        </div>
      ) : scopeError ? (
        <p className="text-sm py-4" style={{ color: 'var(--cp-amber)' }}>
          {scopeError}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {displayedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2
                className="mb-2 h-8 w-8"
                style={{ color: 'var(--cp-green)' }}
                aria-hidden
              />
              <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
                Ingen registrerede bekymringsnotater
              </p>
              {!demoMode && (
                <p className="mt-1 max-w-xs text-xs" style={{ color: 'var(--cp-muted2)' }}>
                  Formelle journalnotater med kladde → godkendt finder du under{' '}
                  <strong>Journal (7 dage)</strong> og på beboerens 360°.
                </p>
              )}
            </div>
          ) : (
            displayedNotes.map((n) => {
              const tone = severityTone(n.severity);
              return (
                <article
                  key={n.id}
                  className="flex gap-3 rounded-xl p-4 transition-all duration-200"
                  style={{ backgroundColor: 'var(--cp-bg3)', border: '1px solid var(--cp-border)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
                  }}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold leading-none"
                    style={severityStyle(tone)}
                  >
                    {n.severity}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                        {n.residentName}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: 'var(--cp-amber-dim)', color: 'var(--cp-amber)' }}
                      >
                        {n.category}
                      </span>
                    </div>
                    <p
                      className="mt-1.5 text-sm whitespace-pre-wrap"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      {n.note}
                    </p>
                    <div
                      className="mt-2 flex flex-wrap items-center gap-2 text-xs"
                      style={{ color: 'var(--cp-muted2)' }}
                    >
                      <time dateTime={n.createdAt.toISOString()} suppressHydrationWarning>
                        {formatNoteDate(n.createdAt)}
                      </time>
                      <span aria-hidden>·</span>
                      <span>{n.staffInitials}</span>
                      {!demoMode && (
                        <>
                          <span aria-hidden>·</span>
                          <Link
                            href={`/resident-360-view/${n.residentId}?tab=overblik`}
                            className="font-medium underline-offset-2 hover:underline"
                            style={{ color: 'var(--cp-green)' }}
                          >
                            360° overblik
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeNote(n.id)}
                    className="shrink-0 self-start rounded p-1 transition-all duration-200"
                    style={{ color: 'var(--cp-muted2)' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--cp-red)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--cp-muted2)';
                    }}
                    aria-label="Fjern note"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </article>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

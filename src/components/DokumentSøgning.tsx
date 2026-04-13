'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Search, User, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  residentNameRoomInitialsMatch,
  residentSearchRank,
  sortResidentsBySearchRelevance,
} from '@/lib/residentSearchMatch';
import { isResidentUuidForCloud } from '@/lib/residentUuid';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';

type CategoryKey = 'journal' | 'handleplan' | 'medicin' | 'bekymringsnotater' | 'aftaler';

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  journal: 'Journal',
  handleplan: 'Handleplan',
  medicin: 'Medicin',
  bekymringsnotater: 'Bekymringsnotater',
  aftaler: 'Aftaler',
};

/** Demo 360°: tab-query som ResidentDemo360Client forventer. */
const CATEGORY_TO_TAB_DEMO: Record<CategoryKey, string> = {
  journal: 'notes',
  handleplan: 'goals',
  medicin: 'medication',
  bekymringsnotater: 'notes',
  aftaler: 'overview',
};

/** Live 360°: danske faner på /resident-360-view/[id]. */
const CATEGORY_TO_TAB_LIVE: Record<CategoryKey, string> = {
  journal: 'overblik',
  handleplan: 'plan',
  medicin: 'medicin',
  bekymringsnotater: 'overblik',
  aftaler: 'plan',
};

interface MockDoc {
  category: CategoryKey;
  title: string;
}

interface MockResident {
  id: string;
  name: string;
  initials: string;
  room: string;
  documents: MockDoc[];
}

const MOCK_RESIDENTS: MockResident[] = [
  {
    id: 'res-001',
    name: 'Anders M.',
    initials: 'AM',
    room: '104',
    documents: [
      { category: 'journal', title: 'Dagsnotat 24. marts — god dagsform' },
      { category: 'handleplan', title: 'Handleplan Q1 2026 — opdateret' },
      { category: 'medicin', title: 'Medicinliste — Metformin 500 mg' },
      { category: 'aftaler', title: 'Aftale psykolog 4. april' },
    ],
  },
  {
    id: 'res-002',
    name: 'Finn L.',
    initials: 'FL',
    room: '108',
    documents: [
      { category: 'journal', title: 'Kriseplan gennemgang' },
      { category: 'bekymringsnotater', title: 'Bekymring: søvn og social kontakt' },
      { category: 'medicin', title: 'Sertralin — dosering justeret' },
      { category: 'handleplan', title: 'Mål: daglig struktur' },
    ],
  },
  {
    id: 'res-003',
    name: 'Kirsten R.',
    initials: 'KR',
    room: '102',
    documents: [
      { category: 'journal', title: 'Notat efter lægesamtale' },
      { category: 'medicin', title: 'Risperidon — bivirkninger vurderet' },
      { category: 'bekymringsnotater', title: 'Opfølgning på appetit' },
      { category: 'aftaler', title: 'Transport til hospitalsundersøgelse' },
    ],
  },
  {
    id: 'res-004',
    name: 'Maja T.',
    initials: 'MT',
    room: '106',
    documents: [
      { category: 'journal', title: 'Samtale om angst' },
      { category: 'handleplan', title: 'Handleplan — sociale aktiviteter' },
      { category: 'aftaler', title: 'Gruppeaktivitet torsdag' },
      { category: 'medicin', title: 'Lisinopril ordination' },
    ],
  },
  {
    id: 'res-005',
    name: 'Thomas B.',
    initials: 'TB',
    room: '110',
    documents: [
      { category: 'journal', title: 'Status ved indflytning' },
      { category: 'handleplan', title: 'Økonomisk støtte — koordinering med kommune' },
      { category: 'medicin', title: 'Ingen fast medicin — noteret' },
      { category: 'aftaler', title: 'Samtale jobcenter' },
    ],
  },
  {
    id: 'res-006',
    name: 'Lena P.',
    initials: 'LP',
    room: '103',
    documents: [
      { category: 'journal', title: 'Ugentlig trivselsnotat' },
      { category: 'medicin', title: 'Panodil — PN log' },
      { category: 'aftaler', title: 'Besøg pårørende søndag' },
      { category: 'bekymringsnotater', title: 'Obs: træthed efter aktivitet' },
    ],
  },
];

function docMatchesQuery(d: MockDoc, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return false;
  return d.title.toLowerCase().includes(s) || CATEGORY_LABEL[d.category].toLowerCase().includes(s);
}

type NavEntry =
  | { kind: 'resident'; resident: MockResident }
  | { kind: 'doc'; resident: MockResident; doc: MockDoc };

export type DokumentSøgningProps = {
  /** Mørk Care Portal-flade (matcher demo / --cp-* tokens) */
  carePortalDark?: boolean;
  /** live → resident-360-view; demo → demo-rute; pilot → simuleret 360 bag login */
  linkTarget?: 'live' | 'demo' | 'pilot';
};

function DokumentSøgningFallback({
  carePortalDark: _carePortalDark,
}: {
  carePortalDark?: boolean;
}) {
  return (
    <div className="relative w-full max-w-md min-w-0 flex-1">
      <div
        className="flex h-[42px] items-center gap-2 rounded-full px-3 animate-pulse"
        style={{
          backgroundColor: 'var(--cp-input-bg)',
          border: '1px solid var(--cp-input-border)',
        }}
        aria-hidden
      />
    </div>
  );
}

function DokumentSøgningInner({
  carePortalDark = false,
  linkTarget = 'live',
}: DokumentSøgningProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dark = carePortalDark;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [liveResidents, setLiveResidents] = useState<MockResident[]>([]);
  const [liveResidentsLoading, setLiveResidentsLoading] = useState(() => linkTarget !== 'demo');

  useEffect(() => {
    if (linkTarget === 'demo') {
      setLiveResidentsLoading(false);
      return;
    }
    let cancelled = false;
    setLiveResidentsLoading(true);
    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) {
          setLiveResidents([]);
          setLiveResidentsLoading(false);
        }
        return;
      }
      const { orgId, error } = await resolveStaffOrgResidents(supabase);
      if (cancelled) return;
      if (error || !orgId) {
        setLiveResidents([]);
        setLiveResidentsLoading(false);
        return;
      }
      const { data: rows, error: rowsErr } = await supabase
        .from('care_residents')
        .select('user_id, display_name, onboarding_data')
        .eq('org_id', orgId)
        .order('display_name');
      if (cancelled) return;
      if (rowsErr || !rows) {
        setLiveResidents([]);
        setLiveResidentsLoading(false);
        return;
      }
      const mapped: MockResident[] = [];
      for (const row of rows) {
        const id = String(row.user_id ?? '');
        if (!isResidentUuidForCloud(id)) continue;
        const od = (row.onboarding_data ?? {}) as Record<string, unknown>;
        const name = String(row.display_name ?? '').trim() || '—';
        const rawIni = od.avatar_initials;
        const initials =
          typeof rawIni === 'string' && rawIni.trim().length > 0
            ? rawIni.trim().toUpperCase().slice(0, 4)
            : name.slice(0, 2).toUpperCase();
        const rawRoom = od.room;
        const room = typeof rawRoom === 'string' && rawRoom.trim() ? rawRoom.trim() : '—';
        mapped.push({ id, name, initials, room, documents: [] });
      }
      setLiveResidents(mapped);
      setLiveResidentsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [linkTarget]);

  const residentsForSearch = useMemo(
    () => (linkTarget === 'demo' ? MOCK_RESIDENTS : liveResidents),
    [linkTarget, liveResidents]
  );

  const categoryTab = useCallback(
    (cat: CategoryKey) =>
      linkTarget === 'live' ? CATEGORY_TO_TAB_LIVE[cat] : CATEGORY_TO_TAB_DEMO[cat],
    [linkTarget]
  );

  const defaultResidentTab = linkTarget === 'live' ? 'overblik' : 'overview';

  useEffect(() => {
    const raw = searchParams.get('q');
    if (raw == null) return;
    setQuery(raw);
    if (raw.trim().length >= 1) setOpen(true);
  }, [searchParams]);

  const q = query.trim();

  const matchedResidents = useMemo(() => {
    if (q.length < 1) return [];
    const filtered = residentsForSearch.filter((r) =>
      residentNameRoomInitialsMatch(r.name, r.room, r.initials, q)
    );
    return sortResidentsBySearchRelevance(filtered, q);
  }, [q, residentsForSearch]);

  const matchedDocs = useMemo(() => {
    if (q.length < 1) return [] as { resident: MockResident; doc: MockDoc }[];
    const out: { resident: MockResident; doc: MockDoc }[] = [];
    for (const r of residentsForSearch) {
      for (const doc of r.documents) {
        if (docMatchesQuery(doc, q)) out.push({ resident: r, doc });
      }
    }
    out.sort((a, b) => {
      const ra = residentSearchRank(a.resident.name, a.resident.room, a.resident.initials, q);
      const rb = residentSearchRank(b.resident.name, b.resident.room, b.resident.initials, q);
      if (rb !== ra) return rb - ra;
      const t = a.doc.title.localeCompare(b.doc.title, 'da', { sensitivity: 'base' });
      if (t !== 0) return t;
      return a.resident.name.localeCompare(b.resident.name, 'da', { sensitivity: 'base' });
    });
    return out;
  }, [q, residentsForSearch]);

  const navEntries = useMemo((): NavEntry[] => {
    const e: NavEntry[] = [];
    for (const r of matchedResidents) e.push({ kind: 'resident', resident: r });
    for (const { resident, doc } of matchedDocs) e.push({ kind: 'doc', resident, doc });
    return e;
  }, [matchedResidents, matchedDocs]);

  useEffect(() => {
    setActiveIndex(0);
  }, [q]);

  useEffect(() => {
    if (activeIndex >= navEntries.length) setActiveIndex(Math.max(0, navEntries.length - 1));
  }, [navEntries.length, activeIndex]);

  const navigateTo = useCallback(
    (residentId: string, tab: string) => {
      const qKeep = query.trim() ? `&q=${encodeURIComponent(query.trim())}` : '';
      const qs = `?tab=${encodeURIComponent(tab)}${qKeep}`;
      if (linkTarget === 'demo') {
        router.push(`/care-portal-demo/residents/${encodeURIComponent(residentId)}${qs}`);
      } else if (linkTarget === 'pilot') {
        router.push(`/care-portal-resident-preview/${encodeURIComponent(residentId)}${qs}`);
      } else {
        router.push(
          `/resident-360-view/${encodeURIComponent(residentId)}?tab=${encodeURIComponent(tab)}${qKeep}`
        );
      }
      setOpen(false);
      setQuery('');
    },
    [router, linkTarget, query]
  );

  const activateEntry = useCallback(
    (entry: NavEntry) => {
      if (entry.kind === 'resident') {
        navigateTo(entry.resident.id, defaultResidentTab);
      } else {
        const tab = categoryTab(entry.doc.category);
        navigateTo(entry.resident.id, tab);
      }
    },
    [navigateTo, defaultResidentTab, categoryTab]
  );

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (!open && q.length >= 1) setOpen(true);
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!navEntries.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % navEntries.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + navEntries.length) % navEntries.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = navEntries[activeIndex];
      if (entry) activateEntry(entry);
    }
  };

  const showDropdown = open && q.length >= 1;

  const uniqueCategories = (r: MockResident): CategoryKey[] => {
    const keys = new Set<CategoryKey>();
    for (const d of r.documents) keys.add(d.category);
    return Array.from(keys);
  };

  const shellCls =
    'border shadow-none transition-all duration-200 focus-within:shadow-[0_0_0_1px_rgba(45,212,160,0.12)]';
  const shellStyle: React.CSSProperties = {
    backgroundColor: 'var(--cp-input-bg)',
    borderColor: 'var(--cp-input-border)',
  };

  const iconMuted = 'var(--cp-muted2)';
  const inputCls =
    'w-full border-none bg-transparent py-2 pl-10 pr-3 text-sm placeholder:text-[var(--cp-muted)] focus:outline-none focus:ring-0';
  const inputStyle: React.CSSProperties = {
    color: 'var(--cp-text)',
  };

  const kbdCls =
    'mr-2 hidden shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium sm:inline';
  const kbdStyle: React.CSSProperties = {
    backgroundColor: 'var(--cp-bg2)',
    color: 'var(--cp-muted2)',
  };

  const clearBtnCls = 'mr-2 rounded-full p-1 transition-all duration-200';
  const clearBtnStyle: React.CSSProperties = {
    color: 'var(--cp-muted)',
  };

  const dropdownCls = dark
    ? 'absolute left-0 right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--cp-border)] bg-[var(--cp-bg2)] shadow-[0_12px_40px_rgba(0,0,0,0.35)]'
    : 'absolute left-0 right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-100 bg-white shadow-lg';

  const emptyCls = dark
    ? 'px-4 py-8 text-center text-sm text-[var(--cp-muted)]'
    : 'px-4 py-8 text-center text-sm text-gray-400';

  const sectionHdrCls = dark
    ? 'px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cp-muted2)]'
    : 'px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400';

  const rowActive = (active: boolean) =>
    dark
      ? active
        ? 'bg-[var(--cp-bg3)] ring-1 ring-[rgba(45,212,160,0.25)]'
        : 'hover:bg-[var(--cp-bg3)]'
      : active
        ? 'bg-gray-50 ring-1 ring-budr-purple/20'
        : 'hover:bg-gray-50';

  const chipCls = dark
    ? 'rounded-full bg-[var(--cp-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--cp-text)] transition-all duration-200 hover:bg-[rgba(45,212,160,0.12)] hover:text-[var(--cp-green)]'
    : 'rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 transition-all duration-200 hover:bg-budr-lavender hover:text-budr-purple';

  const docMetaCls = dark ? 'text-xs text-[var(--cp-muted)]' : 'text-xs text-gray-400';
  const docTitleCls = dark
    ? 'text-sm font-medium text-[var(--cp-text)]'
    : 'text-sm font-medium text-gray-900';
  const residentNameCls = dark
    ? 'text-sm font-semibold text-[var(--cp-text)]'
    : 'text-sm font-semibold text-gray-900';
  const roomCls = dark
    ? 'flex items-center gap-1 text-xs text-[var(--cp-muted)]'
    : 'flex items-center gap-1 text-xs text-gray-400';
  const dividerCls = dark
    ? 'mt-3 border-t border-[var(--cp-border)] pt-3'
    : 'mt-3 border-t border-gray-100 pt-3';
  const fileIconCls = dark
    ? 'mt-0.5 h-4 w-4 shrink-0 text-[var(--cp-muted2)]'
    : 'mt-0.5 h-4 w-4 shrink-0 text-gray-400';

  return (
    <div ref={rootRef} className="relative w-full max-w-md min-w-0 flex-1">
      <div className={`flex items-center gap-2 rounded-full ${shellCls}`} style={shellStyle}>
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-3 h-4 w-4"
            style={{ color: iconMuted }}
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (q.length >= 1) setOpen(true);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Søg initialer, beboer eller dokumenter…"
            autoComplete="off"
            aria-expanded={showDropdown}
            aria-controls="dokument-sogning-results"
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <span className={kbdCls} style={kbdStyle}>
          ⌘K
        </span>
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setOpen(false);
              inputRef.current?.focus();
            }}
            className={clearBtnCls}
            style={clearBtnStyle}
            aria-label="Ryd søgning"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div
          id="dokument-sogning-results"
          className={dropdownCls}
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
        >
          {liveResidentsLoading && linkTarget !== 'demo' ? (
            <div className={emptyCls}>Henter beboere…</div>
          ) : matchedResidents.length === 0 && matchedDocs.length === 0 ? (
            <div className={emptyCls}>Ingen resultater for &apos;{q}&apos;</div>
          ) : (
            <div className="max-h-[min(70vh,28rem)] overflow-y-auto py-2">
              {matchedResidents.length > 0 ? (
                <div className="px-2">
                  <div className={sectionHdrCls}>Beboere</div>
                  {matchedResidents.map((r, i) => {
                    const globalIdx = i;
                    const active = globalIdx === activeIndex;
                    return (
                      <div
                        key={r.id}
                        role="option"
                        aria-selected={active}
                        className={`rounded-lg transition-all duration-200 ${rowActive(active)}`}
                      >
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          onClick={() => navigateTo(r.id, defaultResidentTab)}
                          className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
                        >
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={
                              dark
                                ? {
                                    background:
                                      'linear-gradient(135deg, rgba(110,231,183,0.9), rgba(5,150,105,0.95))',
                                  }
                                : { backgroundColor: '#7F77DD' }
                            }
                          >
                            {r.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={residentNameCls}>{r.name}</div>
                            <div className={roomCls}>
                              <User className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                              <span>Værelse {r.room}</span>
                            </div>
                          </div>
                          <div className="flex max-w-[48%] shrink-0 flex-wrap justify-end gap-1">
                            {uniqueCategories(r).map((cat) => (
                              <button
                                key={`${r.id}-${cat}`}
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  navigateTo(r.id, categoryTab(cat));
                                }}
                                className={chipCls}
                              >
                                {CATEGORY_LABEL[cat]}
                              </button>
                            ))}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {matchedDocs.length > 0 ? (
                <div className={`px-2 ${matchedResidents.length > 0 ? dividerCls : ''}`}>
                  <div
                    className={`flex items-center gap-1.5 px-2 pb-2 text-xs font-semibold uppercase tracking-wide ${dark ? 'text-[var(--cp-muted2)]' : 'text-gray-400'}`}
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    Dokumenter
                  </div>
                  {matchedDocs.map(({ resident, doc }, i) => {
                    const globalIdx = matchedResidents.length + i;
                    const active = globalIdx === activeIndex;
                    return (
                      <button
                        key={`${resident.id}-${doc.category}-${doc.title}-${i}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        onClick={() => navigateTo(resident.id, categoryTab(doc.category))}
                        className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-all duration-200 ${rowActive(active)}`}
                      >
                        <FileText className={fileIconCls} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <div className={docTitleCls}>{doc.title}</div>
                          <div className={docMetaCls}>
                            {CATEGORY_LABEL[doc.category]} · {resident.name}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function DokumentSøgning(props: DokumentSøgningProps) {
  return (
    <Suspense fallback={<DokumentSøgningFallback carePortalDark={props.carePortalDark} />}>
      <DokumentSøgningInner {...props} />
    </Suspense>
  );
}

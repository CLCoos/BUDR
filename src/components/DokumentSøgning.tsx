'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Search, User, X } from 'lucide-react';

type CategoryKey = 'journal' | 'handleplan' | 'medicin' | 'bekymringsnotater' | 'aftaler';

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  journal: 'Journal',
  handleplan: 'Handleplan',
  medicin: 'Medicin',
  bekymringsnotater: 'Bekymringsnotater',
  aftaler: 'Aftaler',
};

/** Maps document category to existing resident-360 tab ids. */
const CATEGORY_TO_TAB: Record<CategoryKey, string> = {
  journal: 'notes',
  handleplan: 'goals',
  medicin: 'medication',
  bekymringsnotater: 'notes',
  aftaler: 'overview',
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
      { category: 'medicin', title: 'Panodil — PRN log' },
      { category: 'aftaler', title: 'Besøg pårørende søndag' },
      { category: 'bekymringsnotater', title: 'Obs: træthed efter aktivitet' },
    ],
  },
];

function residentMatchesQuery(r: MockResident, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return false;
  if (r.initials.toLowerCase().includes(s)) return true;
  if (r.name.toLowerCase().includes(s)) return true;
  const parts = r.name.toLowerCase().split(/\s+/);
  if (parts.some(p => p.startsWith(s))) return true;
  return false;
}

function docMatchesQuery(d: MockDoc, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return false;
  return (
    d.title.toLowerCase().includes(s) ||
    CATEGORY_LABEL[d.category].toLowerCase().includes(s)
  );
}

type NavEntry =
  | { kind: 'resident'; resident: MockResident }
  | { kind: 'doc'; resident: MockResident; doc: MockDoc };

export default function DokumentSøgning() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim();

  const matchedResidents = useMemo(() => {
    if (q.length < 1) return [];
    return MOCK_RESIDENTS.filter(r => residentMatchesQuery(r, q));
  }, [q]);

  const matchedDocs = useMemo(() => {
    if (q.length < 1) return [] as { resident: MockResident; doc: MockDoc }[];
    const out: { resident: MockResident; doc: MockDoc }[] = [];
    for (const r of MOCK_RESIDENTS) {
      for (const doc of r.documents) {
        if (docMatchesQuery(doc, q)) out.push({ resident: r, doc });
      }
    }
    return out;
  }, [q]);

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
      router.push(`/resident-360-view?id=${encodeURIComponent(residentId)}&tab=${encodeURIComponent(tab)}`);
      setOpen(false);
      setQuery('');
    },
    [router],
  );

  const activateEntry = useCallback(
    (entry: NavEntry) => {
      if (entry.kind === 'resident') {
        navigateTo(entry.resident.id, 'overview');
      } else {
        const tab = CATEGORY_TO_TAB[entry.doc.category] ?? 'overview';
        navigateTo(entry.resident.id, tab);
      }
    },
    [navigateTo],
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
      setActiveIndex(i => (i + 1) % navEntries.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + navEntries.length) % navEntries.length);
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

  return (
    <div ref={rootRef} className="relative w-full max-w-md min-w-0 flex-1">
      <div className="flex items-center gap-2 rounded-full border border-transparent bg-gray-100 shadow-none transition-all duration-200 focus-within:border-budr-purple/30 focus-within:bg-white focus-within:shadow-md">
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (q.length >= 1) setOpen(true);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Søg beboer eller dokumenter…"
            autoComplete="off"
            aria-expanded={showDropdown}
            aria-controls="dokument-sogning-results"
            className="w-full border-none bg-transparent py-2 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0"
          />
        </div>
        <span className="mr-2 hidden shrink-0 rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500 sm:inline">
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
            className="mr-2 rounded-full p-1 text-gray-400 transition-all duration-200 hover:bg-gray-200 hover:text-gray-600"
            aria-label="Ryd søgning"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div
          id="dokument-sogning-results"
          className="absolute left-0 right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-100 bg-white shadow-lg"
          role="listbox"
          onMouseDown={e => e.preventDefault()}
        >
          {matchedResidents.length === 0 && matchedDocs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Ingen resultater for &apos;{q}&apos;
            </div>
          ) : (
            <div className="max-h-[min(70vh,28rem)] overflow-y-auto py-2">
              {matchedResidents.length > 0 ? (
                <div className="px-2">
                  <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Beboere
                  </div>
                  {matchedResidents.map((r, i) => {
                    const globalIdx = i;
                    const active = globalIdx === activeIndex;
                    return (
                      <div
                        key={r.id}
                        role="option"
                        aria-selected={active}
                        className={`rounded-lg transition-all duration-200 ${
                          active ? 'bg-gray-50 ring-1 ring-budr-purple/20' : 'hover:bg-gray-50'
                        }`}
                      >
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          onClick={() => navigateTo(r.id, 'overview')}
                          className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
                        >
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: '#7F77DD' }}
                          >
                            {r.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900">{r.name}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <User className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                              <span>Værelse {r.room}</span>
                            </div>
                          </div>
                          <div className="flex max-w-[48%] shrink-0 flex-wrap justify-end gap-1">
                            {uniqueCategories(r).map(cat => (
                              <button
                                key={`${r.id}-${cat}`}
                                type="button"
                                onClick={ev => {
                                  ev.stopPropagation();
                                  navigateTo(r.id, CATEGORY_TO_TAB[cat]);
                                }}
                                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 transition-all duration-200 hover:bg-budr-lavender hover:text-budr-purple"
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
                <div className={`px-2 ${matchedResidents.length > 0 ? 'mt-3 border-t border-gray-100 pt-3' : ''}`}>
                  <div className="flex items-center gap-1.5 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
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
                        onClick={() => navigateTo(resident.id, CATEGORY_TO_TAB[doc.category])}
                        className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-all duration-200 ${
                          active ? 'bg-gray-50 ring-1 ring-budr-purple/20' : 'hover:bg-gray-50'
                        }`}
                      >
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                          <div className="text-xs text-gray-400">
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

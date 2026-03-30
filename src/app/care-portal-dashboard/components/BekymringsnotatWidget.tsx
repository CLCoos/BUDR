'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Plus, X } from 'lucide-react';

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

const RESIDENTS: { id: string; name: string }[] = [
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

function severityClasses(tone: 'green' | 'amber' | 'red'): string {
  switch (tone) {
    case 'green':
      return 'bg-green-500 text-white';
    case 'amber':
      return 'bg-amber-500 text-white';
    default:
      return 'bg-red-500 text-white';
  }
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

export default function BekymringsnotatWidget() {
  const [notes, setNotes] = useState<Bekymringsnotat[]>(createInitialMockNotes);
  const [showForm, setShowForm] = useState(false);
  const [residentId, setResidentId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [category, setCategory] = useState<BekymringsCategory | ''>('');
  const [severity, setSeverity] = useState(5);

  const displayedNotes = useMemo(
    () => [...notes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5),
    [notes],
  );

  const sliderTone = severityTone(severity);
  const sliderBadgeClass = severityClasses(sliderTone);

  const removeNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!residentId || !category || !noteText.trim()) return;
      const res = RESIDENTS.find(r => r.id === residentId);
      if (!res) return;
      const newNote: Bekymringsnotat = {
        id: `bn-${Date.now()}`,
        residentId,
        residentName: res.name,
        note: noteText.trim().slice(0, 120),
        category,
        severity,
        createdAt: new Date(),
        staffInitials: 'SK',
      };
      setNotes(prev => [newNote, ...prev]);
      setNoteText('');
      setCategory('');
      setResidentId('');
      setSeverity(5);
      setShowForm(false);
    },
    [residentId, category, noteText, severity],
  );

  return (
    <section
      className="mb-6 w-full max-w-2xl rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
      aria-label="Bekymringsnotater"
    >
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Bekymringsnotater</h2>
            <p className="text-sm text-gray-500">Hurtig registrering af bekymringer</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(s => !s)}
          aria-expanded={showForm}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-budr-purple px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Tilføj
        </button>
      </div>

      <div
        className={`grid transition-all duration-200 ease-out ${showForm ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <form
            onSubmit={handleSubmit}
            className="mb-4 space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-all duration-200"
          >
            <div className="relative">
              <label htmlFor="bek-resident" className="sr-only">
                Beboer
              </label>
              <select
                id="bek-resident"
                value={residentId}
                onChange={e => setResidentId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-sm text-gray-900 transition-all duration-200 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal"
              >
                <option value="">Vælg beboer</option>
                {RESIDENTS.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
            </div>

            <div>
              <label htmlFor="bek-note" className="sr-only">
                Beskrivelse
              </label>
              <input
                id="bek-note"
                type="text"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                maxLength={120}
                placeholder="Beskriv bekymringen kort..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal"
              />
              <div className="mt-1 text-right text-xs text-gray-400">{noteText.length}/120</div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Kategori</p>
              <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map(cat => {
                  const selected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                        selected
                          ? 'bg-budr-purple text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-500">Alvor (1–10)</span>
                <span
                  className={`inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold transition-all duration-200 ${sliderBadgeClass}`}
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
                onChange={e => setSeverity(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-green-400 via-amber-400 to-red-500 transition-all duration-200
                  [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-gray-800 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm
                  [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:hover:scale-110
                  [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-gray-800 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-budr-teal py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
            >
              Gem bekymring
            </button>
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {displayedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-green-500" aria-hidden />
            <p className="text-sm text-gray-400">Ingen aktive bekymringer</p>
          </div>
        ) : (
          displayedNotes.map(n => {
            const tone = severityTone(n.severity);
            return (
              <article
                key={n.id}
                className="flex gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold leading-none ${severityClasses(tone)}`}
                >
                  {n.severity}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{n.residentName}</span>
                    <span className="rounded-full bg-budr-lavender px-2 py-0.5 text-xs font-medium text-budr-purple">
                      {n.category}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-gray-600">{n.note}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <time dateTime={n.createdAt.toISOString()} suppressHydrationWarning>{formatNoteDate(n.createdAt)}</time>
                    <span aria-hidden>·</span>
                    <span>{n.staffInitials}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeNote(n.id)}
                  className="shrink-0 self-start rounded p-1 text-gray-300 transition-all duration-200 hover:text-red-400"
                  aria-label="Fjern note"
                >
                  <X className="h-4 w-4" />
                </button>
              </article>
            );
          })
        )}
      </div>

      {/*
        Supabase — care_bekymringsnotater (wire later):

        Columns: id, resident_id, staff_id, note, category, severity, created_at
        (+ facility_id for tenancy / RLS as needed)

        1) Fetch on mount (latest 5):
           supabase.from('care_bekymringsnotater')
             .select('id, resident_id, staff_id, note, category, severity, created_at')
             .in('facility_id', care_visible_facility_ids())
             .order('created_at', { ascending: false })
             .limit(5)

        2) Insert on submit:
           supabase.from('care_bekymringsnotater').insert({
             resident_id, staff_id, note, category, severity,
           })

        3) RLS: policies use care_visible_facility_ids() so staff only see/insert rows
           for authorized facilities (join residents or denormalized facility_id).
      */}
    </section>
  );
}

'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Search, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  TrafficLightFilter,
  type TrafficFilterValue,
} from '@/components/patterns/TrafficLightFilter';

interface ShiftNote {
  id: string;
  date: string;
  time: string;
  shift: 'dag' | 'aften' | 'nat';
  staffName: string;
  staffInitials: string;
  flagColor: 'groen' | 'gul' | 'roed' | 'sort';
  body: string;
}

const mockShiftNotes: ShiftNote[] = [
  {
    id: 'sn-001',
    date: '26/03/2026',
    time: '08:14',
    shift: 'dag',
    staffName: 'Sara K.',
    staffInitials: 'SK',
    flagColor: 'groen',
    body: 'Anders M. havde en god morgen. Spiste morgenmad med de andre beboere. Tog sin medicin kl. 08:14 uden problemer. Var i godt humør og nævnte at han glæder sig til at komme ud i dag. Stemning 7/10, grøn trafiklys. Ingen bekymringer.',
  },
  {
    id: 'sn-002',
    date: '25/03/2026',
    time: '21:10',
    shift: 'aften',
    staffName: 'Morten L.',
    staffInitials: 'ML',
    flagColor: 'groen',
    body: 'Rolig aften. Anders spiste aftensmad og deltog i fælles TV-tid. Gik i seng ca. kl. 22:30. Tog Quetiapin kl. 21:10. Ingen observationer.',
  },
  {
    id: 'sn-003',
    date: '25/03/2026',
    time: '13:45',
    shift: 'dag',
    staffName: 'Sara K.',
    staffInitials: 'SK',
    flagColor: 'groen',
    body: 'Gennemførte trin 2 i mål om udeaktivitet — gik rundt om bygningen. Var stolt af sig selv. Brugte Tankefanger-øvelse efter en svær tanke om morgenen. Intensitet faldt fra 7 til 4.',
  },
  {
    id: 'sn-004',
    date: '24/03/2026',
    time: '20:05',
    shift: 'aften',
    staffName: 'Hanne B.',
    staffInitials: 'HB',
    flagColor: 'gul',
    body: 'Anders virkede lidt tilbagetrukket ved aftensmad. Ville ikke tale om det. Stemning 5/10, gul trafiklys. Tog sin medicin. Gik tidligt i seng kl. 21:00. Anbefaler opfølgning på dagvagten.',
  },
  {
    id: 'sn-005',
    date: '24/03/2026',
    time: '11:20',
    shift: 'dag',
    staffName: 'Sara K.',
    staffInitials: 'SK',
    flagColor: 'groen',
    body: 'God dag. Gennemførte trin 1 i mål — gik til postkassen. Var glad bagefter. Spiste frokost og tog medicin til rette tid.',
  },
  {
    id: 'sn-006',
    date: '23/03/2026',
    time: '02:10',
    shift: 'nat',
    staffName: 'Hanne B.',
    staffInitials: 'HB',
    flagColor: 'groen',
    body: 'Rolig nat. Ingen observationer. Sov hele natten.',
  },
  {
    id: 'sn-007',
    date: '23/03/2026',
    time: '19:35',
    shift: 'aften',
    staffName: 'Morten L.',
    staffInitials: 'ML',
    flagColor: 'gul',
    body: 'Var lidt urolig om aftenen. Nævnte at han var nervøs for en kommende lægebesøg. Lavede vejrtrækningsøvelser. Rolignet sig. Stemning 4/10.',
  },
];

const flagConfig = {
  groen: { label: 'Grøn', color: '#22C55E', bg: '#F0FDF4' },
  gul: { label: 'Gul', color: '#EAB308', bg: '#FEFCE8' },
  roed: { label: 'Rød', color: '#EF4444', bg: '#FEF2F2' },
  sort: { label: 'Sort', color: '#1F2937', bg: '#F9FAFB' },
};

const shiftLabels = {
  dag: { label: 'Dagvagt', emoji: '☀️' },
  aften: { label: 'Aftenvagt', emoji: '🌙' },
  nat: { label: 'Nattevagt', emoji: '🌃' },
};

function staffInitials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]!.slice(0, 1) + p[1]!.slice(0, 1)).toUpperCase();
  const one = p[0] ?? name;
  return one.slice(0, 2).toUpperCase() || '?';
}

function hourToShift(hour: number): 'dag' | 'aften' | 'nat' {
  if (hour >= 6 && hour < 15) return 'dag';
  if (hour >= 15 && hour < 22) return 'aften';
  return 'nat';
}

function categoryToFlag(category: string): ShiftNote['flagColor'] {
  const c = category.toLowerCase();
  if (c.includes('kritisk') || c.includes('krise')) return 'roed';
  if (c.includes('bekym') || c.includes('advar')) return 'gul';
  return 'groen';
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('da-DK', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function formatTimeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  variant?: 'mock' | 'live';
  residentId?: string;
  carePortalDark?: boolean;
}

export default function ShiftNotesFeed({ variant = 'mock', residentId, carePortalDark }: Props) {
  const d = carePortalDark === true;
  const [search, setSearch] = useState('');
  const [flagFilter, setFlagFilter] = useState<TrafficFilterValue>('all');
  const [notes, setNotes] = useState<ShiftNote[]>(() => (variant === 'mock' ? mockShiftNotes : []));
  const [loading, setLoading] = useState(variant === 'live');

  const fetchLiveNotes = useCallback(async () => {
    if (variant !== 'live') {
      setNotes(mockShiftNotes);
      setLoading(false);
      return;
    }
    if (!residentId?.trim()) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const since = new Date(Date.now() - 28 * 86400000).toISOString();
    const { data, error } = await supabase
      .from('journal_entries')
      .select('id, staff_name, entry_text, category, created_at, journal_status')
      .eq('resident_id', residentId.trim())
      .eq('journal_status', 'godkendt')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(80);

    if (error || !data) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const mapped: ShiftNote[] = data.map((row) => {
      const createdAt = String(row.created_at ?? '');
      const created = new Date(createdAt);
      const name = (row.staff_name as string) || 'Personale';
      return {
        id: row.id as string,
        date: formatDateShort(createdAt),
        time: formatTimeShort(createdAt),
        shift: hourToShift(created.getHours()),
        staffName: name,
        staffInitials: staffInitials(name),
        flagColor: categoryToFlag((row.category as string) ?? ''),
        body: row.entry_text as string,
      };
    });

    setNotes(mapped);
    setLoading(false);
  }, [residentId, variant]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchLiveNotes().catch(() => {
      if (!cancelled) {
        setNotes([]);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchLiveNotes]);

  useEffect(() => {
    if (variant !== 'live' || !residentId?.trim()) return;
    const supabase = createClient();
    if (!supabase) return;

    const residentKey = residentId.trim();
    const channel = supabase
      .channel(`journal-feed-${residentKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journal_entries',
          filter: `resident_id=eq.${residentKey}`,
        },
        () => {
          void fetchLiveNotes();
        }
      )
      .subscribe();

    const onJournalUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ residentId?: string }>;
      const targetResidentId = custom.detail?.residentId;
      if (!targetResidentId || targetResidentId === residentKey) {
        void fetchLiveNotes();
      }
    };

    window.addEventListener('portal-journal-updated', onJournalUpdated);

    return () => {
      window.removeEventListener('portal-journal-updated', onJournalUpdated);
      void supabase.removeChannel(channel);
    };
  }, [fetchLiveNotes, residentId, variant]);

  const filtered = notes.filter((n) => {
    const matchSearch =
      n.body.toLowerCase().includes(search.toLowerCase()) ||
      n.staffName.toLowerCase().includes(search.toLowerCase());
    const matchFlag =
      flagFilter === 'all'
        ? true
        : flagFilter === 'none'
          ? false
          : (flagFilter === 'red' ? 'roed' : flagFilter === 'yellow' ? 'gul' : 'groen') ===
            n.flagColor;
    return matchSearch && matchFlag;
  });

  const grouped: Record<string, ShiftNote[]> = {};
  filtered.forEach((note) => {
    if (!grouped[note.date]) grouped[note.date] = [];
    grouped[note.date].push(note);
  });
  const trafficCounts = {
    all: notes.length,
    red: notes.filter((n) => n.flagColor === 'roed').length,
    yellow: notes.filter((n) => n.flagColor === 'gul').length,
    green: notes.filter((n) => n.flagColor === 'groen').length,
    none: 0,
  } as const;

  const title = variant === 'live' ? 'Journal (godkendt)' : 'Vagtnotat';

  if (variant === 'live' && loading) {
    return (
      <div
        className={`overflow-hidden rounded-xl border ${d ? '' : 'rounded-lg border-gray-100 bg-white'}`}
        style={
          d ? { backgroundColor: 'var(--cp-bg2)', borderColor: 'var(--cp-border)' } : undefined
        }
      >
        <div
          className={`border-b px-4 py-3 ${d ? '' : 'border-gray-100'}`}
          style={d ? { borderColor: 'var(--cp-border)' } : undefined}
        >
          <span
            className={`text-sm font-semibold ${d ? '' : 'text-gray-800'}`}
            style={d ? { color: 'var(--cp-text)' } : undefined}
          >
            {title}
          </span>
        </div>
        <div
          className={`py-10 text-center text-xs ${d ? '' : 'text-gray-400'}`}
          style={d ? { color: 'var(--cp-muted)' } : undefined}
        >
          Henter noter…
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border ${d ? '' : 'rounded-lg border-gray-100 bg-white'}`}
      style={d ? { backgroundColor: 'var(--cp-bg2)', borderColor: 'var(--cp-border)' } : undefined}
    >
      <div
        className={`border-b px-4 py-3 ${d ? '' : 'border-gray-100'}`}
        style={d ? { borderColor: 'var(--cp-border)' } : undefined}
      >
        <div className="mb-3 flex items-center justify-between">
          <span
            className={`text-sm font-semibold ${d ? '' : 'text-gray-800'}`}
            style={d ? { color: 'var(--cp-text)' } : undefined}
          >
            {title}
          </span>
          {variant === 'mock' && (
            <button
              type="button"
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                d
                  ? 'border-[var(--cp-border)] text-[var(--cp-muted)] hover:bg-white/5'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <Download size={12} /> Eksportér
            </button>
          )}
        </div>
        {variant === 'live' && (
          <p
            className={`mb-2 text-[10px] ${d ? '' : 'text-gray-500'}`}
            style={d ? { color: 'var(--cp-muted2)' } : undefined}
          >
            Seneste godkendte journalnotater (ikke kladder). Også kort vist under &ldquo;Journal i
            dag&rdquo; ovenfor.
          </p>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={13}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${d ? 'text-[var(--cp-muted2)]' : 'text-gray-400'}`}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg i noter..."
              className={`w-full rounded-lg border py-2 pl-8 pr-3 text-sm focus:outline-none ${
                d ? '' : 'border-gray-200 focus:border-[#1D9E75]'
              }`}
              style={
                d
                  ? {
                      borderColor: 'var(--cp-border)',
                      backgroundColor: 'var(--cp-bg3)',
                      color: 'var(--cp-text)',
                    }
                  : undefined
              }
            />
          </div>
          <TrafficLightFilter
            value={flagFilter}
            onChange={(next) => {
              if (next !== 'none') setFlagFilter(next);
            }}
            size="sm"
            showLabels={false}
            counts={trafficCounts}
          />
        </div>
      </div>

      <div
        className={`max-h-[600px] divide-y overflow-y-auto scrollbar-hide ${d ? 'divide-[var(--cp-border)]' : 'divide-gray-50'}`}
      >
        {variant === 'live' && !loading && notes.length === 0 && (
          <div
            className={`py-10 text-center text-xs ${d ? '' : 'text-gray-400'}`}
            style={d ? { color: 'var(--cp-muted)' } : undefined}
          >
            Ingen godkendte notater
          </div>
        )}

        {Object.entries(grouped).map(([date, dayNotes]) => (
          <div key={`date-group-${date}`}>
            <div
              className={`sticky top-0 px-4 py-2 ${d ? '' : 'bg-gray-50'}`}
              style={d ? { backgroundColor: 'var(--cp-bg3)' } : undefined}
            >
              <span
                className={`text-xs font-semibold ${d ? '' : 'text-gray-500'}`}
                style={d ? { color: 'var(--cp-muted)' } : undefined}
              >
                {date}
              </span>
            </div>
            {dayNotes.map((note) => {
              const fc = flagConfig[note.flagColor];
              const sl = shiftLabels[note.shift];
              return (
                <div
                  key={note.id}
                  className={`px-4 py-4 transition-colors ${d ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={
                        d
                          ? {
                              background:
                                'linear-gradient(135deg, rgba(45,212,160,0.9) 0%, #0d9488 100%)',
                            }
                          : { backgroundColor: '#0F1B2D' }
                      }
                    >
                      {note.staffInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${d ? '' : 'text-gray-800'}`}
                          style={d ? { color: 'var(--cp-text)' } : undefined}
                        >
                          {note.staffName}
                        </span>
                        <span
                          className={`text-xs ${d ? '' : 'text-gray-500'}`}
                          style={d ? { color: 'var(--cp-muted)' } : undefined}
                        >
                          {sl.emoji} {sl.label} · {note.date} kl. {note.time}
                        </span>
                        <span
                          className="rounded px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: fc.bg, color: fc.color }}
                        >
                          {fc.label}
                        </span>
                      </div>
                      <p
                        className={`text-sm leading-relaxed ${d ? '' : 'text-gray-700'}`}
                        style={d ? { color: 'var(--cp-muted)' } : undefined}
                      >
                        {note.body}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {filtered.length === 0 && notes.length > 0 && (
          <div className="py-12 text-center">
            <div
              className={`text-sm ${d ? '' : 'text-gray-400'}`}
              style={d ? { color: 'var(--cp-muted)' } : undefined}
            >
              Ingen noter matcher søgningen
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

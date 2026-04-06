'use client';
import React, { useEffect, useState } from 'react';
import { Search, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ShiftNote {
  id: string;
  date: string;
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
    shift: 'dag',
    staffName: 'Sara K.',
    staffInitials: 'SK',
    flagColor: 'groen',
    body: 'Anders M. havde en god morgen. Spiste morgenmad med de andre beboere. Tog sin medicin kl. 08:14 uden problemer. Var i godt humør og nævnte at han glæder sig til at komme ud i dag. Stemning 7/10, grøn trafiklys. Ingen bekymringer.',
  },
  {
    id: 'sn-002',
    date: '25/03/2026',
    shift: 'aften',
    staffName: 'Morten L.',
    staffInitials: 'ML',
    flagColor: 'groen',
    body: 'Rolig aften. Anders spiste aftensmad og deltog i fælles TV-tid. Gik i seng ca. kl. 22:30. Tog Quetiapin kl. 21:10. Ingen observationer.',
  },
  {
    id: 'sn-003',
    date: '25/03/2026',
    shift: 'dag',
    staffName: 'Sara K.',
    staffInitials: 'SK',
    flagColor: 'groen',
    body: 'Gennemførte trin 2 i mål om udeaktivitet — gik rundt om bygningen. Var stolt af sig selv. Brugte Tankefanger-øvelse efter en svær tanke om morgenen. Intensitet faldt fra 7 til 4.',
  },
  {
    id: 'sn-004',
    date: '24/03/2026',
    shift: 'aften',
    staffName: 'Hanne B.',
    staffInitials: 'HB',
    flagColor: 'gul',
    body: 'Anders virkede lidt tilbagetrukket ved aftensmad. Ville ikke tale om det. Stemning 5/10, gul trafiklys. Tog sin medicin. Gik tidligt i seng kl. 21:00. Anbefaler opfølgning på dagvagten.',
  },
  {
    id: 'sn-005',
    date: '24/03/2026',
    shift: 'dag',
    staffName: 'Sara K.',
    staffInitials: 'SK',
    flagColor: 'groen',
    body: 'God dag. Gennemførte trin 1 i mål — gik til postkassen. Var glad bagefter. Spiste frokost og tog medicin til rette tid.',
  },
  {
    id: 'sn-006',
    date: '23/03/2026',
    shift: 'nat',
    staffName: 'Hanne B.',
    staffInitials: 'HB',
    flagColor: 'groen',
    body: 'Rolig nat. Ingen observationer. Sov hele natten.',
  },
  {
    id: 'sn-007',
    date: '23/03/2026',
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

interface Props {
  variant?: 'mock' | 'live';
  residentId?: string;
}

export default function ShiftNotesFeed({ variant = 'mock', residentId }: Props) {
  const [search, setSearch] = useState('');
  const [flagFilter, setFlagFilter] = useState<string>('alle');
  const [notes, setNotes] = useState<ShiftNote[]>(() => (variant === 'mock' ? mockShiftNotes : []));
  const [loading, setLoading] = useState(variant === 'live');

  useEffect(() => {
    if (variant === 'mock') {
      setNotes(mockShiftNotes);
      setLoading(false);
      return;
    }

    if (!residentId?.trim()) {
      setNotes([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) {
          setNotes([]);
          setLoading(false);
        }
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

      if (cancelled) return;

      if (error || !data) {
        setNotes([]);
        setLoading(false);
        return;
      }

      const mapped: ShiftNote[] = data.map((row) => {
        const created = new Date(row.created_at as string);
        const dateStr = created.toLocaleDateString('da-DK', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const name = (row.staff_name as string) || 'Personale';
        return {
          id: row.id as string,
          date: dateStr,
          shift: hourToShift(created.getHours()),
          staffName: name,
          staffInitials: staffInitials(name),
          flagColor: categoryToFlag((row.category as string) ?? ''),
          body: row.entry_text as string,
        };
      });

      setNotes(mapped);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [variant, residentId]);

  const filtered = notes.filter((n) => {
    const matchSearch =
      n.body.toLowerCase().includes(search.toLowerCase()) ||
      n.staffName.toLowerCase().includes(search.toLowerCase());
    const matchFlag = flagFilter === 'alle' || n.flagColor === flagFilter;
    return matchSearch && matchFlag;
  });

  const grouped: Record<string, ShiftNote[]> = {};
  filtered.forEach((note) => {
    if (!grouped[note.date]) grouped[note.date] = [];
    grouped[note.date].push(note);
  });

  const title = variant === 'live' ? 'Journal (godkendt)' : 'Vagtnotat';

  if (variant === 'live' && loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        <div className="py-10 text-center text-xs text-gray-400">Henter noter…</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {variant === 'mock' && (
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <Download size={12} /> Eksportér
            </button>
          )}
        </div>
        {variant === 'live' && (
          <p className="text-[10px] text-gray-500 mb-2">
            Seneste godkendte journalnotater (ikke kladder). Også kort vist under &ldquo;Journal i
            dag&rdquo; ovenfor.
          </p>
        )}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg i noter..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1D9E75] transition-colors"
            />
          </div>
          <div className="flex gap-1">
            {(['alle', 'groen', 'gul', 'roed'] as const).map((f) => (
              <button
                key={`notefilter-${f}`}
                type="button"
                onClick={() => setFlagFilter(f)}
                className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  flagFilter === f
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'alle' ? 'Alle' : f === 'roed' ? '🔴' : f === 'gul' ? '🟡' : '🟢'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto scrollbar-hide">
        {variant === 'live' && !loading && notes.length === 0 && (
          <div className="py-10 text-center text-xs text-gray-400">Ingen godkendte notater</div>
        )}

        {Object.entries(grouped).map(([date, dayNotes]) => (
          <div key={`date-group-${date}`}>
            <div className="px-4 py-2 bg-gray-50 sticky top-0">
              <span className="text-xs font-semibold text-gray-500">{date}</span>
            </div>
            {dayNotes.map((note) => {
              const fc = flagConfig[note.flagColor];
              const sl = shiftLabels[note.shift];
              return (
                <div key={note.id} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0F1B2D] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {note.staffInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-sm font-semibold text-gray-800">
                          {note.staffName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {sl.emoji} {sl.label}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{ backgroundColor: fc.bg, color: fc.color }}
                        >
                          {fc.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{note.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {filtered.length === 0 && notes.length > 0 && (
          <div className="py-12 text-center">
            <div className="text-gray-400 text-sm">Ingen noter matcher søgningen</div>
          </div>
        )}
      </div>
    </div>
  );
}

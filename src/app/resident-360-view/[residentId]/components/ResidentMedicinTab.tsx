'use client';

import React, { useEffect, useState } from 'react';
import { Pill, CheckCircle2, Clock } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────

interface MedDefinition {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  time: string;        // "08:00" | "21:00" | "Efter aftale" etc.
  timeGroup: 'morgen' | 'middag' | 'aften' | 'behoev';
  prescribedBy: string;
  notes?: string;
}

interface GivenRecord {
  given: boolean;
  givenAt: string; // ISO timestamp
}

// ── Medication definitions (shared across residents for demo) ─

const MEDS: MedDefinition[] = [
  {
    id: 'med-001',
    name: 'Escitalopram',
    dose: '10 mg',
    frequency: 'Dagligt',
    time: '08:00',
    timeGroup: 'morgen',
    prescribedBy: 'Dr. Andersen',
    notes: 'Tages med mad. Kan give svimmelhed de første uger.',
  },
  {
    id: 'med-002',
    name: 'Quetiapin',
    dose: '50 mg',
    frequency: 'Aften',
    time: '21:00',
    timeGroup: 'aften',
    prescribedBy: 'Dr. Andersen',
    notes: 'Sovemedicin. Tages 30 min før sengetid.',
  },
  {
    id: 'med-003',
    name: 'Melatonin',
    dose: '3 mg',
    frequency: 'Aften (ved behov)',
    time: '22:00',
    timeGroup: 'aften',
    prescribedBy: 'Dr. Nielsen',
  },
  {
    id: 'med-004',
    name: 'Lorazepam',
    dose: '1 mg',
    frequency: 'Ved behov (max 3×/uge)',
    time: 'Efter aftale',
    timeGroup: 'behoev',
    prescribedBy: 'Dr. Andersen',
    notes: 'Kun ved akut angst. Notér i vagtnotat ved brug.',
  },
];

const GROUP_LABELS: Record<MedDefinition['timeGroup'], string> = {
  morgen: 'Morgen',
  middag: 'Middag',
  aften:  'Aften',
  behoev: 'Ved behov',
};

const GROUPS: MedDefinition['timeGroup'][] = ['morgen', 'middag', 'aften', 'behoev'];

// ── Storage helpers ───────────────────────────────────────────

function storageKey(residentId: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `budr_med_v1_${residentId}_${today}`;
}

function loadGiven(residentId: string): Record<string, GivenRecord> {
  try {
    const raw = localStorage.getItem(storageKey(residentId));
    return raw ? (JSON.parse(raw) as Record<string, GivenRecord>) : {};
  } catch {
    return {};
  }
}

function saveGiven(residentId: string, data: Record<string, GivenRecord>) {
  try {
    localStorage.setItem(storageKey(residentId), JSON.stringify(data));
  } catch {
    // storage unavailable
  }
}

// ── Component ────────────────────────────────────────────────

interface Props {
  residentId: string;
}

export default function ResidentMedicinTab({ residentId }: Props) {
  const [given, setGiven] = useState<Record<string, GivenRecord>>({});

  useEffect(() => {
    setGiven(loadGiven(residentId));
  }, [residentId]);

  function toggle(medId: string) {
    setGiven(prev => {
      const next = { ...prev };
      if (next[medId]?.given) {
        delete next[medId];
      } else {
        next[medId] = { given: true, givenAt: new Date().toISOString() };
      }
      saveGiven(residentId, next);
      return next;
    });
  }

  const givenCount = Object.values(given).filter(g => g.given).length;
  const totalActive = MEDS.length;

  return (
    <div className="space-y-5 max-w-xl">
      {/* Summary bar */}
      <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${
        givenCount === totalActive
          ? 'bg-[#E1F5EE] border-[#A8DFC9]'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-2">
          <Pill size={16} className={givenCount === totalActive ? 'text-[#1D9E75]' : 'text-amber-500'} />
          <span className={`text-sm font-semibold ${givenCount === totalActive ? 'text-[#1D9E75]' : 'text-amber-700'}`}>
            {givenCount}/{totalActive} mediciner givet i dag
          </span>
        </div>
        {givenCount === totalActive && (
          <span className="text-xs font-medium text-[#1D9E75]">Alt givet ✓</span>
        )}
      </div>

      {/* Groups */}
      {GROUPS.map(group => {
        const meds = MEDS.filter(m => m.timeGroup === group);
        if (meds.length === 0) return null;
        return (
          <div key={group} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {GROUP_LABELS[group]}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {meds.map(med => {
                const rec = given[med.id];
                const isGiven = rec?.given ?? false;
                const givenAt = rec?.givenAt
                  ? new Date(rec.givenAt).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
                  : null;

                return (
                  <div key={med.id} className="px-4 py-4 flex items-center gap-4">
                    {/* Med info */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isGiven ? 'bg-[#E1F5EE]' : 'bg-gray-100'
                    }`}>
                      <Pill size={18} className={isGiven ? 'text-[#1D9E75]' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${isGiven ? 'text-gray-400' : 'text-gray-800'}`}>
                          {med.name}
                        </span>
                        <span className="text-xs text-gray-500">{med.dose}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                        <Clock size={10} />
                        {med.time} · {med.frequency}
                      </div>
                      {med.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 italic">{med.notes}</p>
                      )}
                    </div>

                    {/* Give / Given button */}
                    <button
                      type="button"
                      onClick={() => toggle(med.id)}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        isGiven
                          ? 'bg-[#E1F5EE] text-[#1D9E75] border border-[#A8DFC9] hover:bg-[#CCF0E0]'
                          : 'bg-[#0F1B2D] text-white hover:bg-[#1a2d47] active:scale-95'
                      }`}
                    >
                      {isGiven ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Givet {givenAt}</span>
                        </>
                      ) : (
                        'Giv medicin'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-gray-400 text-center pb-2">
        Medicin-status gemmes lokalt for i dag. Nulstilles automatisk ved midnat.
      </p>
    </div>
  );
}

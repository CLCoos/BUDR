'use client';
import React, { useState } from 'react';
import { Pill, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  time: string;
  takenToday: boolean;
  takenAt?: string;
  prescribedBy: string;
  notes?: string;
  status: 'aktiv' | 'pauseret' | 'stoppet';
}

const medications: Medication[] = [
  {
    id: 'med-001',
    name: 'Escitalopram',
    dose: '10 mg',
    frequency: 'Dagligt',
    time: '08:00',
    takenToday: true,
    takenAt: '08:14',
    prescribedBy: 'Dr. Andersen',
    notes: 'Tages med mad. Kan give svimmelhed de første uger.',
    status: 'aktiv',
  },
  {
    id: 'med-002',
    name: 'Quetiapin',
    dose: '50 mg',
    frequency: 'Aften',
    time: '21:00',
    takenToday: false,
    prescribedBy: 'Dr. Andersen',
    notes: 'Sovemedicin. Tages 30 min før sengetid.',
    status: 'aktiv',
  },
  {
    id: 'med-003',
    name: 'Melatonin',
    dose: '3 mg',
    frequency: 'Aften (ved behov)',
    time: '22:00',
    takenToday: false,
    prescribedBy: 'Dr. Nielsen',
    status: 'aktiv',
  },
  {
    id: 'med-004',
    name: 'Lorazepam',
    dose: '1 mg',
    frequency: 'Ved behov (max 3x/uge)',
    time: 'Efter aftale',
    takenToday: false,
    prescribedBy: 'Dr. Andersen',
    notes: 'Kun ved akut angst. Notér i vagtnotat ved brug.',
    status: 'aktiv',
  },
  {
    id: 'med-005',
    name: 'Sertralin',
    dose: '100 mg',
    frequency: 'Dagligt',
    time: '08:00',
    takenToday: false,
    prescribedBy: 'Dr. Andersen',
    status: 'stoppet',
  },
];

interface Props {
  compact?: boolean;
}

export default function MedicationList({ compact }: Props) {
  const [showAll, setShowAll] = useState(false);

  const activeMeds = medications.filter((m) => m.status === 'aktiv');
  const displayMeds = compact ? activeMeds.slice(0, 3) : showAll ? medications : activeMeds;
  const takenCount = activeMeds.filter((m) => m.takenToday).length;

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Pill size={15} className="text-[#1D9E75]" />
          <span className="text-sm font-semibold text-gray-800">Medicin</span>
        </div>
        <div
          className={`text-xs font-medium px-2 py-1 rounded ${
            takenCount === activeMeds.length
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {takenCount}/{activeMeds.length} taget i dag
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {displayMeds.map((med) => (
          <div key={med.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  med.status === 'stoppet' ? 'bg-gray-100' : 'bg-[#E6F7F2]'
                }`}
              >
                <Pill
                  size={14}
                  className={med.status === 'stoppet' ? 'text-gray-400' : 'text-[#1D9E75]'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-sm font-semibold ${med.status === 'stoppet' ? 'text-gray-400 line-through' : 'text-gray-800'}`}
                  >
                    {med.name}
                  </span>
                  <span className="text-xs text-gray-500">{med.dose}</span>
                  {med.status === 'pauseret' && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                      Pauseret
                    </span>
                  )}
                  {med.status === 'stoppet' && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                      Stoppet
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={10} />
                    {med.time} · {med.frequency}
                  </div>
                </div>
                {med.notes && !compact && (
                  <div className="text-xs text-gray-500 mt-1 italic">{med.notes}</div>
                )}
              </div>
              <div className="flex-shrink-0">
                {med.status === 'aktiv' &&
                  (med.takenToday ? (
                    <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 size={14} className="text-green-500" />
                      {med.takenAt}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <AlertCircle size={14} className="text-amber-400" />
                      Mangler
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!compact && medications.filter((m) => m.status === 'stoppet').length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showAll ? 'Skjul stoppede' : 'Vis stoppede mediciner'}
          </button>
        </div>
      )}
    </div>
  );
}

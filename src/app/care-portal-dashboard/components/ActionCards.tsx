'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Home, Building2, Plus } from 'lucide-react';

type Props = {
  onOpenOverrapport: () => void;
};

export default function ActionCards({ onOpenOverrapport }: Props) {
  const router = useRouter();

  return (
    <div
      className="grid gap-[10px] mb-6"
      style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
    >
      {/* Kort 1 — Overrapport */}
      <button
        type="button"
        onClick={onOpenOverrapport}
        className="text-left bg-white border border-gray-200/80 rounded-xl px-4 py-[14px] hover:shadow-sm hover:border-gray-300 transition-all duration-150 group"
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#E1F5EE' }}
          >
            <Home size={18} style={{ color: '#0F6E56' }} />
          </div>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
          >
            Klar til godkendelse
          </span>
        </div>
        <div className="text-sm font-semibold text-gray-900 group-hover:text-[#0F6E56] transition-colors">
          Overrapport
        </div>
        <div className="text-xs text-gray-500 mt-0.5">AI-udkast til vagtskifte</div>
      </button>

      {/* Kort 2 — Indsatsdokumentation */}
      <button
        type="button"
        onClick={() => router.push('/care-portal-indsatsdok')}
        className="text-left bg-white border border-gray-200/80 rounded-xl px-4 py-[14px] hover:shadow-sm hover:border-gray-300 transition-all duration-150 group"
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#FAEEDA' }}
          >
            <Building2 size={18} style={{ color: '#854F0B' }} />
          </div>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#FAEEDA', color: '#854F0B' }}
          >
            2 afventer
          </span>
        </div>
        <div className="text-sm font-semibold text-gray-900 group-hover:text-[#854F0B] transition-colors">
          Indsatsdok.
        </div>
        <div className="text-xs text-gray-500 mt-0.5">§136 / §141 struktureret flow</div>
      </button>

      {/* Kort 3 — Tilsynsrapport */}
      <button
        type="button"
        onClick={() => router.push('/care-portal-tilsynsrapport')}
        className="text-left bg-white border border-gray-200/80 rounded-xl px-4 py-[14px] hover:shadow-sm hover:border-gray-300 transition-all duration-150 group"
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#E6F1FB' }}
          >
            <Plus size={18} style={{ color: '#185FA5' }} />
          </div>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#E6F1FB', color: '#185FA5' }}
          >
            Opdateret i dag
          </span>
        </div>
        <div className="text-sm font-semibold text-gray-900 group-hover:text-[#185FA5] transition-colors">
          Tilsynsrapport
        </div>
        <div className="text-xs text-gray-500 mt-0.5">Autogenerer pakke til tilsyn</div>
      </button>
    </div>
  );
}

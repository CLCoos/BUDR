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
        className="text-left rounded-xl px-4 py-[14px] transition-all duration-150 group"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          border: '1px solid var(--cp-border)',
          borderRadius: 12,
          borderTop: '2px solid var(--cp-green)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border2)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--cp-green-dim)' }}
          >
            <Home size={18} style={{ color: 'var(--cp-green)' }} />
          </div>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
          >
            Klar til godkendelse
          </span>
        </div>
        <div className="text-sm font-semibold transition-colors" style={{ color: 'var(--cp-text)' }}>
          Overrapport
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--cp-muted)' }}>AI-udkast til vagtskifte</div>
      </button>

      {/* Kort 2 — Indsatsdokumentation */}
      <button
        type="button"
        onClick={() => router.push('/care-portal-indsatsdok')}
        className="text-left rounded-xl px-4 py-[14px] transition-all duration-150 group"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          border: '1px solid var(--cp-border)',
          borderRadius: 12,
          borderTop: '2px solid var(--cp-amber)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border2)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--cp-amber-dim)' }}
          >
            <Building2 size={18} style={{ color: 'var(--cp-amber)' }} />
          </div>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--cp-amber-dim)', color: 'var(--cp-amber)' }}
          >
            2 afventer
          </span>
        </div>
        <div className="text-sm font-semibold transition-colors" style={{ color: 'var(--cp-text)' }}>
          Indsatsdok.
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--cp-muted)' }}>§136 / §141 struktureret flow</div>
      </button>

      {/* Kort 3 — Tilsynsrapport */}
      <button
        type="button"
        onClick={() => router.push('/care-portal-tilsynsrapport')}
        className="text-left rounded-xl px-4 py-[14px] transition-all duration-150 group"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          border: '1px solid var(--cp-border)',
          borderRadius: 12,
          borderTop: '2px solid var(--cp-blue)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border2)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--cp-blue-dim)' }}
          >
            <Plus size={18} style={{ color: 'var(--cp-blue)' }} />
          </div>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--cp-blue-dim)', color: 'var(--cp-blue)' }}
          >
            Opdateret i dag
          </span>
        </div>
        <div className="text-sm font-semibold transition-colors" style={{ color: 'var(--cp-text)' }}>
          Tilsynsrapport
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--cp-muted)' }}>Autogenerer pakke til tilsyn</div>
      </button>
    </div>
  );
}

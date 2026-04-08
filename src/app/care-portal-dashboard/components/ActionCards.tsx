'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Home, Building2, Plus, Sparkles } from 'lucide-react';

type Props = {
  onOpenOverrapport: () => void;
  /** Ekstra kort til borger-app (pilot med simulerede dashboard-widgets) */
  showPilotBorgerCard?: boolean;
};

export default function ActionCards({ onOpenOverrapport, showPilotBorgerCard = false }: Props) {
  const router = useRouter();

  return (
    <div
      className="mb-6 grid gap-[10px]"
      style={{
        gridTemplateColumns: showPilotBorgerCard
          ? 'repeat(auto-fit, minmax(170px, 1fr))'
          : 'repeat(3, 1fr)',
      }}
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
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border2)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
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
        <div
          className="text-sm font-semibold transition-colors"
          style={{ color: 'var(--cp-text)' }}
        >
          Overrapport
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--cp-muted)' }}>
          AI-udkast til vagtskifte
        </div>
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
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border2)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
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
        <div
          className="text-sm font-semibold transition-colors"
          style={{ color: 'var(--cp-text)' }}
        >
          Indsatsdok.
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--cp-muted)' }}>
          Skabeloner til magt- og indsatsdokumentation (serviceloven)
        </div>
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
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border2)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
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
        <div
          className="text-sm font-semibold transition-colors"
          style={{ color: 'var(--cp-text)' }}
        >
          Tilsynsrapport
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--cp-muted)' }}>
          Autogenerer pakke til tilsyn
        </div>
      </button>

      {showPilotBorgerCard ? (
        <button
          type="button"
          onClick={() => router.push('/park-hub')}
          className="group rounded-xl px-4 py-[14px] text-left transition-all duration-150"
          style={{
            backgroundColor: 'var(--cp-bg2)',
            border: '1px solid var(--cp-border)',
            borderRadius: 12,
            borderTop: '2px solid #8b84e8',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border2)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          <div className="mb-3 flex items-start justify-between">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'rgba(139, 132, 232, 0.2)' }}
            >
              <Sparkles size={18} style={{ color: '#a5a0e8' }} />
            </div>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: 'rgba(139, 132, 232, 0.2)', color: '#c4bffc' }}
            >
              Lys
            </span>
          </div>
          <div
            className="text-sm font-semibold transition-colors"
            style={{ color: 'var(--cp-text)' }}
          >
            Borger-app
          </div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
            Åbn den rigtige borger-flade (PIN / session som i drift)
          </div>
        </button>
      ) : null}
    </div>
  );
}

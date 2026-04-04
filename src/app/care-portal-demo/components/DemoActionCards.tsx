'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Home, Building2, Plus } from 'lucide-react';

type Props = {
  onOpenOverrapport: () => void;
};

export default function DemoActionCards({ onOpenOverrapport }: Props) {
  const router = useRouter();

  return (
    <div
      className="mb-6 grid gap-[10px]"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
    >
      <button
        type="button"
        onClick={onOpenOverrapport}
        className="group rounded-xl px-4 py-[14px] text-left transition-all duration-150"
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
        <div className="mb-3 flex items-start justify-between">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--cp-green-dim)' }}
          >
            <Home size={18} style={{ color: 'var(--cp-green)' }} />
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
          >
            Klar til godkendelse
          </span>
        </div>
        <div className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Overrapport
        </div>
        <div className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
          AI-udkast til vagtskifte
        </div>
      </button>

      <button
        type="button"
        onClick={() => router.push('/care-portal-demo/indsatsdok')}
        className="group rounded-xl px-4 py-[14px] text-left transition-all duration-150"
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
        <div className="mb-3 flex items-start justify-between">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--cp-amber-dim)' }}
          >
            <Building2 size={18} style={{ color: 'var(--cp-amber)' }} />
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: 'var(--cp-amber-dim)', color: 'var(--cp-amber)' }}
          >
            2 afventer
          </span>
        </div>
        <div className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Indsatsdok.
        </div>
        <div className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
          Magt- og indsatsdokumentation (serviceloven)
        </div>
      </button>

      <button
        type="button"
        onClick={() => router.push('/care-portal-demo/tilsynsrapport')}
        className="group rounded-xl px-4 py-[14px] text-left transition-all duration-150"
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
        <div className="mb-3 flex items-start justify-between">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--cp-blue-dim)' }}
          >
            <Plus size={18} style={{ color: 'var(--cp-blue)' }} />
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: 'var(--cp-blue-dim)', color: 'var(--cp-blue)' }}
          >
            Opdateret i dag
          </span>
        </div>
        <div className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Tilsynsrapport
        </div>
        <div className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
          Autogenerer pakke til tilsyn
        </div>
      </button>
    </div>
  );
}

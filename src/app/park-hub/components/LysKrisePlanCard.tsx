'use client';

import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { loadKrisePlan } from './LysKrisePlan';

const SECTION_COUNT = 4;

type Props = {
  onOpen: () => void;
};

export default function LysKrisePlanCard({ onOpen }: Props) {
  const [filledCount, setFilledCount] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const plan = loadKrisePlan();
    const filled = Object.values(plan.sections).filter(v => v?.trim()).length;
    setFilledCount(Math.min(filled, SECTION_COUNT));
    if (plan.updated_at) {
      setUpdatedAt(
        new Date(plan.updated_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }),
      );
    }
  }, []);

  const pct = Math.round((filledCount / SECTION_COUNT) * 100);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl px-4 py-4 transition-all duration-150 active:scale-[0.98]"
      style={{
        backgroundColor: 'var(--lys-bg3)',
        border: '1px solid var(--lys-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 flex items-center justify-center rounded-xl shrink-0"
          style={{ backgroundColor: 'var(--lys-green-dim)' }}
        >
          <Shield className="h-4 w-4" style={{ color: 'var(--lys-green)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--lys-text)' }}>Min kriseplan</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--lys-muted)' }}>
            {filledCount === 0
              ? 'Ikke udfyldt endnu — tryk for at starte'
              : updatedAt
                ? `Opdateret ${updatedAt} · ${filledCount}/${SECTION_COUNT} sektioner`
                : `${filledCount}/${SECTION_COUNT} sektioner udfyldt`}
          </p>
        </div>
        <span className="text-sm shrink-0" style={{ color: 'var(--lys-muted)' }}>→</span>
      </div>

      {filledCount > 0 && (
        <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--lys-bg4)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: 'var(--lys-green)' }}
          />
        </div>
      )}
    </button>
  );
}

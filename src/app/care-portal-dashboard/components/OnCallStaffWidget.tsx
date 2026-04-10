'use client';

import React, { useMemo } from 'react';
import { PhoneCall } from 'lucide-react';

type ShiftKey = 'day' | 'evening' | 'night';

const SHIFT_LABELS: Record<ShiftKey, string> = {
  day: 'Dag (06:00-14:00)',
  evening: 'Aften (14:00-22:00)',
  night: 'Nat (22:00-06:00)',
};

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

function toDanishPhoneFromSeed(seed: number): string {
  const d1 = (seed % 9) + 1;
  const d2 = ((seed >> 3) % 10 + 10) % 10;
  const d3 = ((seed >> 6) % 10 + 10) % 10;
  const d4 = ((seed >> 9) % 10 + 10) % 10;
  const d5 = ((seed >> 12) % 10 + 10) % 10;
  const d6 = ((seed >> 15) % 10 + 10) % 10;
  const d7 = ((seed >> 18) % 10 + 10) % 10;
  const d8 = ((seed >> 21) % 10 + 10) % 10;
  return `${d1}${d2} ${d3}${d4} ${d5}${d6} ${d7}${d8}`;
}

export default function OnCallStaffWidget() {
  const today = new Date().toISOString().slice(0, 10);
  const phoneByShift = useMemo(() => {
    const result: Record<ShiftKey, string> = {
      day: '',
      evening: '',
      night: '',
    };
    (Object.keys(SHIFT_LABELS) as ShiftKey[]).forEach((shift) => {
      const seed = hashSeed(`${today}-${shift}`);
      result[shift] = toDanishPhoneFromSeed(seed);
    });
    return result;
  }, [today]);

  return (
    <section className="cp-card-elevated p-4" aria-label="Vagthavende personale">
      <div className="flex items-center gap-2 mb-3">
        <PhoneCall size={16} style={{ color: 'var(--cp-blue)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Vagthavende i dag
        </h3>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--cp-muted)' }}>
        Bruges af borgerens kriseflow trin 3. Telefoner er simulerede på dashboardet og
        ændres i Indstillinger.
      </p>
      <div className="space-y-3">
        {(Object.keys(SHIFT_LABELS) as ShiftKey[]).map((shift) => {
          return (
            <div
              key={shift}
              className="rounded-lg border p-3"
              style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--cp-muted)' }}>
                {SHIFT_LABELS[shift]}
              </p>
              <div
                className="rounded-md border px-2.5 py-2 text-xs font-medium"
                style={{
                  borderColor: 'var(--cp-border)',
                  backgroundColor: 'var(--cp-bg2)',
                  color: 'var(--cp-text)',
                }}
              >
                {phoneByShift[shift]}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

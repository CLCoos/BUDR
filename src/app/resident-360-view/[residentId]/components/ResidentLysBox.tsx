'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Props = {
  residentId: string;
  residentName: string;
};

/**
 * «Lys for X»: hvad borgeren ser i Lys, og om Lys skal være enkel.
 * Enkel Lys har kun tre knapper (Nu, Fortæl, Hjælp) til borgere, der bliver forvirrede af mere.
 */
export default function ResidentLysBox({ residentId, residentName }: Props) {
  const [simpleMode, setSimpleMode] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const firstName = residentName.trim().split(/\s+/)[0] || 'borgeren';

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/portal/resident-lys-settings?residentUserId=${encodeURIComponent(residentId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { simpleMode?: boolean } | null) => {
        if (!cancelled) setSimpleMode(d ? Boolean(d.simpleMode) : false);
      })
      .catch(() => !cancelled && setSimpleMode(false));
    return () => {
      cancelled = true;
    };
  }, [residentId]);

  const toggle = async () => {
    if (simpleMode === null || saving) return;
    const next = !simpleMode;
    setSaving(true);
    try {
      const res = await fetch('/api/portal/resident-lys-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residentUserId: residentId, simpleMode: next }),
      });
      if (!res.ok) throw new Error('save failed');
      setSimpleMode(next);
      toast.success(
        next ? `Enkel Lys er slået til for ${firstName}` : `${firstName} ser nu hele Lys igen`
      );
    } catch {
      toast.error('Det blev ikke gemt. Prøv igen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="mb-4 rounded-xl border p-4"
      style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      aria-labelledby="lys-box-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            id="lys-box-title"
            className="text-sm font-semibold"
            style={{ color: 'var(--cp-text)' }}
          >
            Lys for {firstName}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
            {simpleMode
              ? `${firstName} ser tre store knapper: Nu, Fortæl og Hjælp.`
              : `${firstName} ser Nu, Min dag, Fortæl og Min vej. Hjælp er altid øverst.`}{' '}
            Det, {firstName} sender til jer, og samtaler med Lys kan I læse. Det, der er gemt som
            «Kun mig», kan I ikke se.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span
            id="lys-box-simple"
            className="text-[13px] font-medium"
            style={{ color: 'var(--cp-text)' }}
          >
            Enkel Lys
          </span>
          <button
            type="button"
            role="switch"
            aria-labelledby="lys-box-simple"
            aria-checked={!!simpleMode}
            disabled={simpleMode === null || saving}
            onClick={() => void toggle()}
            className="relative h-6 w-11 rounded-full transition-colors disabled:opacity-50"
            style={{ backgroundColor: simpleMode ? 'var(--cp-green)' : 'var(--cp-bg3)' }}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
              style={{ left: 2, transform: simpleMode ? 'translateX(20px)' : 'translateX(0)' }}
              aria-hidden
            />
          </button>
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useState } from 'react';
import { Pill, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cancelPrn, givePrn, notePrnEffect, type PrnAdministration } from '@/lib/medicationPrn';
import type { MedDefinition } from './types';

type Props = {
  residentId: string;
  med: MedDefinition;
  doses: PrnAdministration[];
  onChanged: () => void;
};

function timeLabel(d: Date): string {
  return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}

/** Behovsmedicin: kan gives flere gange, kræver begrundelse, effekt noteres bagefter. */
export default function PrnMedicationRow({ residentId, med, doses, onChanged }: Props) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [effectDrafts, setEffectDrafts] = useState<Record<string, string>>({});
  const isPaused = med.status === 'pauseret';

  async function give() {
    const supabase = createClient();
    if (!supabase || saving) return;
    setSaving(true);
    const result = await givePrn({ supabase, residentId, medicationId: med.id, reason });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.message.startsWith('Skriv') ? result.message : 'Kunne ikke gemme PN');
      return;
    }
    setReason('');
    toast.success(`PN givet: ${med.name}`);
    onChanged();
  }

  async function saveEffect(id: string) {
    const supabase = createClient();
    if (!supabase) return;
    const result = await notePrnEffect({ supabase, id, effect: effectDrafts[id] ?? '' });
    if (!result.ok) {
      toast.error(result.message.startsWith('Skriv') ? result.message : 'Kunne ikke gemme effekt');
      return;
    }
    setEffectDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    onChanged();
  }

  async function undo(id: string) {
    const supabase = createClient();
    if (!supabase) return;
    const result = await cancelPrn({ supabase, id });
    if (!result.ok) {
      toast.error('Kunne ikke annullere');
      return;
    }
    toast.success('PN-registrering annulleret');
    onChanged();
  }

  return (
    <div className="space-y-3 px-4 py-4">
      <div className="flex items-center gap-4">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'var(--cp-bg3)' }}
        >
          <Pill size={18} className="text-[var(--cp-muted2)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
              {med.name}
            </span>
            <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              {med.dose}
            </span>
            {doses.length > 0 && (
              <span className="rounded px-1.5 py-0.5 text-xs" style={{ color: 'var(--cp-amber)' }}>
                Givet {doses.length}× i dag
              </span>
            )}
          </div>
          <div
            className="mt-0.5 flex items-center gap-1 text-xs"
            style={{ color: 'var(--cp-muted)' }}
          >
            <Clock size={10} />
            {med.frequency}
          </div>
          {med.notes && (
            <p className="mt-0.5 text-xs italic" style={{ color: 'var(--cp-muted2)' }}>
              {med.notes}
            </p>
          )}
        </div>
      </div>

      {!isPaused && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Hvorfor gives PN? (påkrævet)"
            maxLength={1000}
            className="flex-1 rounded-lg border border-[var(--cp-border)] px-3 py-2 text-sm outline-none focus:border-[var(--cp-green)]"
            style={{ backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-text)' }}
          />
          <button
            type="button"
            disabled={saving || !reason.trim()}
            onClick={() => void give()}
            className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'var(--cp-green)', color: '#fff' }}
          >
            Giv PN
          </button>
        </div>
      )}

      {doses.map((dose) => (
        <div
          key={dose.id}
          className="rounded-lg border border-[var(--cp-border)] px-3 py-2 text-xs"
          style={{ color: 'var(--cp-muted)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <span>
              <strong style={{ color: 'var(--cp-text)' }}>{timeLabel(dose.givenAt)}</strong> ·{' '}
              {dose.reason}
            </span>
            <button
              type="button"
              onClick={() => void undo(dose.id)}
              className="underline"
              style={{ color: 'var(--cp-muted2)' }}
            >
              Fortryd
            </button>
          </div>
          {dose.effect ? (
            <p className="mt-1">Effekt: {dose.effect}</p>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                value={effectDrafts[dose.id] ?? ''}
                onChange={(e) =>
                  setEffectDrafts((prev) => ({ ...prev, [dose.id]: e.target.value }))
                }
                placeholder="Notér effekt"
                maxLength={1000}
                className="flex-1 rounded-md border border-[var(--cp-border)] px-2 py-1 outline-none"
                style={{ backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-text)' }}
              />
              <button
                type="button"
                disabled={!(effectDrafts[dose.id] ?? '').trim()}
                onClick={() => void saveEffect(dose.id)}
                className="rounded-md px-2 py-1 font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-green)' }}
              >
                Gem
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

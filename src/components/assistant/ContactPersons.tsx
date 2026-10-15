'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, UserRound } from 'lucide-react';
import { api, ghostButton, inputStyle, primaryButton } from '@/components/documents/shared';

type Contacts = {
  contacts: { staff_id: string; full_name: string; role: 'primaer' | 'sekundaer' }[];
  staff: { id: string; full_name: string }[];
  canEdit: boolean;
  missingTable?: boolean;
};

/**
 * Borgerens kontaktperson(er). Assistentens forslag om borgeren går til dem; har borgeren
 * ingen, går forslagene til alle på bostedet. Kun ledere kan ændre det.
 */
export default function ContactPersons({ residentId }: { residentId: string }) {
  const [data, setData] = useState<Contacts | null>(null);
  const [editing, setEditing] = useState(false);
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api<Contacts>(`/api/portal/assistant/contacts?resident_id=${encodeURIComponent(residentId)}`)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [residentId]);

  if (!data || data.missingTable) return null;

  const startEdit = () => {
    setPrimary(data.contacts.find((c) => c.role === 'primaer')?.staff_id ?? '');
    setSecondary(data.contacts.find((c) => c.role === 'sekundaer')?.staff_id ?? '');
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const ids = [primary, secondary].filter((v, i, a) => v && a.indexOf(v) === i);
      const next = await api<Contacts>('/api/portal/assistant/contacts', {
        method: 'PUT',
        body: JSON.stringify({ resident_id: residentId, staff_ids: ids }),
      });
      setData(next);
      setEditing(false);
      toast.success('Kontaktperson gemt');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke gemme');
    } finally {
      setSaving(false);
    }
  };

  const names = data.contacts.map((c) => c.full_name).join(' og ');

  if (editing) {
    const select = (value: string, onChange: (v: string) => void, label: string) => (
      <label className="text-xs" style={{ color: 'var(--cp-muted)' }}>
        {label}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 block min-h-[40px] w-full rounded-lg border px-3 text-sm sm:w-56"
          style={inputStyle}
        >
          <option value="">Ingen</option>
          {data.staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </label>
    );
    return (
      <div className="mr-auto flex w-full flex-wrap items-end gap-2 sm:w-auto">
        {select(primary, setPrimary, 'Kontaktperson')}
        {select(secondary, setSecondary, 'Anden kontaktperson')}
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className={primaryButton}
          style={{ backgroundColor: 'var(--cp-green)' }}
        >
          {saving && <Loader2 size={14} className="animate-spin" aria-hidden />} Gem
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className={ghostButton}
          style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
        >
          Annuller
        </button>
      </div>
    );
  }

  return (
    <div className="mr-auto flex min-h-[40px] items-center gap-2 text-sm">
      <UserRound size={16} style={{ color: 'var(--cp-muted)' }} aria-hidden />
      <span style={{ color: 'var(--cp-muted)' }}>Kontaktperson:</span>
      <span style={{ color: 'var(--cp-text)' }}>{names || 'Ikke valgt'}</span>
      {data.canEdit && (
        <button
          type="button"
          onClick={startEdit}
          className="min-h-[40px] px-1 text-sm underline"
          style={{ color: 'var(--cp-green)' }}
        >
          {names ? 'Skift' : 'Vælg'}
        </button>
      )}
    </div>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatResidentName, type NameDisplayMode } from '@/lib/residents/formatName';

type ResidentRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  created_at: string;
};

type Props = {
  residents: ResidentRow[];
  residentNameDisplayMode: NameDisplayMode;
};

export default function ResidentsOpsClient({ residents, residentNameDisplayMode }: Props) {
  const [activeResident, setActiveResident] = useState<ResidentRow | null>(null);
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});

  const sorted = useMemo(
    () =>
      [...residents]
        .map((resident) => ({
          ...resident,
          formatted_name: formatResidentName(resident, residentNameDisplayMode),
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [residents, residentNameDisplayMode]
  );

  async function savePin() {
    if (!activeResident) return;
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN skal være præcis 4 cifre.');
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setError('Supabase client mangler.');
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError('Du er ikke logget ind som personale.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resident-pin-set`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resident_id: activeResident.user_id,
            pin,
            staff_token: session.access_token,
          }),
        }
      );
      const json = (await res.json()) as { data?: { success: boolean }; error?: string };
      if (!res.ok || !json.data?.success) {
        setError(json.error ?? 'Kunne ikke nulstille PIN.');
        return;
      }
      setSavedMap((prev) => ({ ...prev, [activeResident.user_id]: true }));
      setActiveResident(null);
      setPin('');
    } catch {
      setError('Netværksfejl — prøv igen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1
          className="font-bold"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22,
            color: 'var(--cp-text)',
            lineHeight: 1.2,
          }}
        >
          Beboere
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
          Nulstil PIN for beboere i organisationen.
        </p>
      </div>

      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: 'var(--cp-border)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--cp-bg2)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Navn</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Oprettet</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Handling</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((resident) => (
              <tr
                key={resident.user_id}
                className="border-t"
                style={{ borderColor: 'var(--cp-border)' }}
              >
                <td className="px-4 py-3" style={{ color: 'var(--cp-text)' }}>
                  {resident.formatted_name}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--cp-muted)' }}>
                  {new Date(resident.created_at).toLocaleDateString('da-DK')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveResident(resident);
                      setPin('');
                      setError(null);
                    }}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--cp-green)' }}
                  >
                    Nulstil PIN
                  </button>
                  {savedMap[resident.user_id] && (
                    <span
                      className="ml-2 text-xs font-semibold"
                      style={{ color: 'var(--cp-green)' }}
                    >
                      ✓ Gemt
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeResident && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/50 px-4">
          <div
            className="w-full max-w-sm rounded-xl border p-4"
            style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
          >
            <h2 className="text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
              Nulstil PIN
            </h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
              {formatResidentName(activeResident, residentNameDisplayMode)}
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="mt-3 h-10 w-full rounded-lg border px-3 text-center tracking-[0.2em]"
              style={{
                borderColor: 'var(--cp-border)',
                backgroundColor: 'var(--cp-bg3)',
                color: 'var(--cp-text)',
              }}
              placeholder="0000"
            />
            {error && (
              <p className="mt-2 text-xs" style={{ color: 'var(--cp-red)' }}>
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveResident(null)}
                className="rounded-lg border px-3 py-2 text-xs font-semibold"
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
              >
                Annullér
              </button>
              <button
                type="button"
                onClick={() => void savePin()}
                disabled={saving}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--cp-green)' }}
              >
                {saving ? 'Gemmer…' : 'Gem PIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
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

/**
 * Leder-oversigt over beboere. Borgere logger ind med et engangslink, som udstedes
 * fra 360° → «Aktive enheder» (PIN-login er ikke i brug).
 */
export default function ResidentsOpsClient({ residents, residentNameDisplayMode }: Props) {
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
          Udsted login-link til en beboer fra 360° under «Aktive enheder».
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
                  <Link
                    href={`/resident-360-view/${resident.user_id}`}
                    className="inline-block rounded-lg px-3 py-2 text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--cp-green)' }}
                  >
                    Login-link i 360°
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

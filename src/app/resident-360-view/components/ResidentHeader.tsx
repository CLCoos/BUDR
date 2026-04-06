'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Phone, Calendar } from 'lucide-react';

type TrafficUi = 'groen' | 'gul' | 'roed' | null;

const TL_CONFIG: Record<
  NonNullable<TrafficUi>,
  { label: string; color: string; bg: string; dot: string }
> = {
  groen: { label: 'Grøn', color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  gul: { label: 'Gul', color: 'text-amber-700', bg: 'bg-amber-100', dot: 'bg-amber-400' },
  roed: { label: 'Rød', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
};

function avatarBg(tl: TrafficUi): React.CSSProperties {
  if (tl === 'roed') return { backgroundColor: '#FCEBEB', color: '#A32D2D' };
  if (tl === 'gul') return { backgroundColor: '#FAEEDA', color: '#854F0B' };
  return { backgroundColor: '#1D9E75', color: '#fff' };
}

interface Props {
  residentId: string;
  name: string;
  initials: string;
  room: string;
  trafficLight: TrafficUi;
  moodScore: number | null;
  lastCheckin: string | null;
  pendingProposals: number;
  moveInDate: string | null;
  primaryContact: string | null;
  primaryContactPhone: string | null;
  primaryContactRelation: string | null;
}

export default function ResidentHeader({
  residentId: _residentId,
  name,
  initials,
  room,
  trafficLight,
  moodScore,
  lastCheckin,
  pendingProposals,
  moveInDate,
  primaryContact,
  primaryContactPhone,
  primaryContactRelation,
}: Props) {
  const tlCfg = trafficLight ? TL_CONFIG[trafficLight] : null;

  return (
    <div>
      <Link href="/resident-360-view">
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ChevronLeft size={16} /> Alle beboere
        </button>
      </Link>

      <div className="bg-white rounded-lg border border-gray-100 p-5">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={avatarBg(trafficLight)}
          >
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{name}</h1>
                <div className="text-sm text-gray-500 mt-0.5">Beboer · Værelse {room}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {tlCfg ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${tlCfg.bg} ${tlCfg.color} text-sm font-semibold`}
                  >
                    <div className={`w-2 h-2 rounded-full ${tlCfg.dot}`} />
                    {tlCfg.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-sm font-semibold">
                    Ingen trafiklys
                  </span>
                )}
                {pendingProposals > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                    {pendingProposals} forslag
                  </span>
                )}
              </div>
            </div>

            {/* 4-cell info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">Indflyttet</div>
                <div className="text-sm font-medium text-gray-800">{moveInDate ?? '—'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">
                  Primær kontakt
                  {primaryContactRelation && (
                    <span className="ml-1 text-gray-400">· {primaryContactRelation}</span>
                  )}
                </div>
                <div className="text-sm font-medium text-gray-800">{primaryContact ?? '—'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">Sidst check-in</div>
                <div className="text-sm font-medium text-gray-800">{lastCheckin ?? '—'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">Stemning</div>
                <div className="text-sm font-medium text-gray-800">
                  {moodScore !== null ? `${moodScore}/10` : '—'}
                </div>
              </div>
            </div>

            {/* Contact + action links */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {primaryContactPhone && (
                <a
                  href={`tel:${primaryContactPhone.replace(/\s/g, '')}`}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1D9E75] transition-colors"
                >
                  <Phone size={14} />
                  {primaryContactPhone}
                </a>
              )}
              {primaryContactPhone && <span className="text-gray-200">·</span>}
              <Link href="/handover-workspace">
                <button className="flex items-center gap-1.5 text-sm text-[#1D9E75] hover:underline">
                  <Calendar size={14} /> Skriv vagtnotat
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

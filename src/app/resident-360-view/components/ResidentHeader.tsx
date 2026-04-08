'use client';

import React from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Phone,
  Calendar,
  BrainCircuit,
  ClipboardList,
  FilePenLine,
} from 'lucide-react';

type TrafficUi = 'groen' | 'gul' | 'roed' | null;

const TL_LABEL: Record<NonNullable<TrafficUi>, string> = {
  groen: 'Grøn',
  gul: 'Gul',
  roed: 'Rød',
};

function trafficStyle(tl: TrafficUi): { bg: string; border: string; label: string; dot: string } {
  if (tl === 'roed')
    return {
      bg: 'rgba(245,101,101,0.12)',
      border: 'rgba(245,101,101,0.4)',
      label: TL_LABEL.roed,
      dot: 'var(--cp-red)',
    };
  if (tl === 'gul')
    return {
      bg: 'rgba(246,173,85,0.12)',
      border: 'rgba(246,173,85,0.4)',
      label: TL_LABEL.gul,
      dot: 'var(--cp-amber)',
    };
  if (tl === 'groen')
    return {
      bg: 'rgba(45,212,160,0.1)',
      border: 'rgba(45,212,160,0.35)',
      label: TL_LABEL.groen,
      dot: 'var(--cp-green)',
    };
  return {
    bg: 'var(--cp-bg3)',
    border: 'var(--cp-border)',
    label: 'Ingen trafiklys',
    dot: 'var(--cp-muted2)',
  };
}

function avatarBg(tl: TrafficUi): React.CSSProperties {
  if (tl === 'roed') return { backgroundColor: 'rgba(245,101,101,0.2)', color: 'var(--cp-red)' };
  if (tl === 'gul') return { backgroundColor: 'rgba(246,173,85,0.2)', color: 'var(--cp-amber)' };
  if (tl === 'groen')
    return { background: 'linear-gradient(135deg, #2dd4a0, #0d9488)', color: '#fff' };
  return { backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-muted)' };
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
  residentId,
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
  const ts = trafficStyle(trafficLight);

  return (
    <div>
      <Link
        href="/resident-360-view"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
        style={{ color: 'var(--cp-muted)' }}
      >
        <ChevronLeft size={16} aria-hidden />
        Alle beboere
      </Link>

      <div
        className="relative overflow-hidden rounded-2xl border p-5 sm:p-7"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          borderColor: 'var(--cp-border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #2dd4a0 0%, transparent 70%)' }}
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold"
            style={avatarBg(trafficLight)}
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1
                  className="text-xl font-normal sm:text-2xl"
                  style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cp-text)' }}
                >
                  {name}
                </h1>
                <p className="mt-0.5 text-sm" style={{ color: 'var(--cp-muted)' }}>
                  Beboer · Værelse {room}
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold"
                  style={{
                    backgroundColor: ts.bg,
                    borderColor: ts.border,
                    color: 'var(--cp-text)',
                  }}
                >
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: ts.dot }}
                  />
                  {ts.label}
                </span>
                {pendingProposals > 0 && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold"
                    style={{
                      backgroundColor: 'var(--cp-amber-dim)',
                      borderColor: 'rgba(246,173,85,0.35)',
                      color: 'var(--cp-amber)',
                    }}
                  >
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                    {pendingProposals} forslag
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: 'Indflyttet', v: moveInDate ?? '—' },
                {
                  k: primaryContactRelation
                    ? `Primær kontakt · ${primaryContactRelation}`
                    : 'Primær kontakt',
                  v: primaryContact ?? '—',
                },
                { k: 'Sidst check-in', v: lastCheckin ?? '—' },
                { k: 'Stemning', v: moodScore !== null ? `${moodScore}/10` : '—' },
              ].map((cell) => (
                <div
                  key={cell.k}
                  className="rounded-xl border px-3 py-2.5"
                  style={{
                    backgroundColor: 'var(--cp-bg3)',
                    borderColor: 'var(--cp-border)',
                  }}
                >
                  <div
                    className="text-[11px] font-medium uppercase tracking-wide"
                    style={{ color: 'var(--cp-muted2)' }}
                  >
                    {cell.k}
                  </div>
                  <div className="mt-0.5 text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                    {cell.v}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {primaryContactPhone && (
                <a
                  href={`tel:${primaryContactPhone.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-90"
                  style={{ color: 'var(--cp-green)' }}
                >
                  <Phone size={14} aria-hidden />
                  {primaryContactPhone}
                </a>
              )}
              <Link
                href="/handover-workspace"
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-90"
                style={{ color: 'var(--cp-muted)' }}
              >
                <FilePenLine size={14} aria-hidden />
                Skriv vagtnotat
              </Link>
            </div>

            {/* Genveje — samme familien som demo-portalen */}
            <div
              className="mt-4 flex flex-wrap gap-2 border-t pt-4"
              style={{ borderColor: 'var(--cp-border)' }}
            >
              <Link
                href="/handover-workspace"
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
              >
                <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                Vagtoverlevering
              </Link>
              <Link
                href="/care-portal-assistant"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #2dd4a0 0%, #0d9488 100%)',
                  boxShadow: '0 2px 12px rgba(45,212,160,0.25)',
                }}
              >
                <BrainCircuit className="h-3.5 w-3.5" aria-hidden />
                Faglig støtte
              </Link>
              <Link
                href={`/resident-360-view/${residentId}?tab=dagsplan`}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
              >
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                Dagsplan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Phone,
  Calendar,
  BrainCircuit,
  ClipboardList,
  FilePenLine,
  Sparkles,
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
  aiBrief?: {
    lead: string;
    bullets: string[];
    actions: { label: string; sectionId: string }[];
    brief_type: string;
    created_at: string;
  } | null;
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
  aiBrief,
}: Props) {
  const router = useRouter();
  const ts = trafficStyle(trafficLight);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  const briefBullets = Array.isArray(aiBrief?.bullets)
    ? aiBrief.bullets.filter((b): b is string => typeof b === 'string')
    : [];
  const briefActions = Array.isArray(aiBrief?.actions)
    ? aiBrief.actions.filter(
        (a): a is { label: string; sectionId: string } =>
          !!a &&
          typeof a === 'object' &&
          typeof (a as { label?: unknown }).label === 'string' &&
          typeof (a as { sectionId?: unknown }).sectionId === 'string'
      )
    : [];

  const runGenerateBrief = useCallback(async () => {
    setBriefLoading(true);
    setBriefError(null);
    try {
      const res = await fetch('/api/portal/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resident_id: residentId, brief_type: 'daily' }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setBriefError(data?.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setBriefError(e instanceof Error ? e.message : 'Netværksfejl');
    } finally {
      setBriefLoading(false);
    }
  }, [residentId, router]);

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

      <section
        className="mb-4 overflow-hidden rounded-2xl border"
        style={{
          borderColor: 'rgba(45,212,160,0.28)',
          background:
            'linear-gradient(135deg, rgba(45,212,160,0.08) 0%, var(--cp-bg2) 40%, var(--cp-bg2) 100%)',
          boxShadow: '0 0 0 1px rgba(45,212,160,0.06)',
        }}
      >
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(110,231,183,0.25), rgba(5,150,105,0.2))',
              boxShadow: '0 4px 20px rgba(45,212,160,0.15)',
            }}
          >
            <BrainCircuit
              className="h-6 w-6"
              style={{ color: 'var(--cp-green)' }}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="text-base font-semibold sm:text-lg"
                style={{ color: 'var(--cp-text)' }}
              >
                BUDR Assistent
              </h2>
              {aiBrief ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: 'rgba(45,212,160,0.12)',
                    color: 'var(--cp-green)',
                  }}
                >
                  {aiBrief.brief_type === 'weekly' ? 'Ugentligt overblik' : 'Dit overblik i dag'}
                </span>
              ) : null}
            </div>
            <p
              className="mt-2 text-sm leading-relaxed sm:text-[15px]"
              style={{ color: 'var(--cp-text)' }}
            >
              {aiBrief?.lead ?? 'Intet AI-brief endnu'}
            </p>
            {briefBullets.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {briefBullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--cp-muted)' }}>
                    <Sparkles
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--cp-green)] opacity-80"
                      aria-hidden
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {briefActions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)] sm:text-sm"
                  style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-green)' }}
                >
                  {a.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void runGenerateBrief()}
                disabled={briefLoading}
                className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50 sm:text-sm"
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
              >
                {briefLoading
                  ? 'Genererer...'
                  : aiBrief
                    ? 'Forny brief'
                    : 'Generér brief'}
              </button>
            </div>
            {briefError ? (
              <p className="mt-2 text-sm text-red-400">Fejl: {briefError}</p>
            ) : null}
          </div>
        </div>
      </section>

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

            {(moveInDate !== null ||
              primaryContact !== null ||
              lastCheckin !== null ||
              moodScore !== null) && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { k: 'Indflyttet', v: moveInDate },
                  {
                    k: primaryContactRelation
                      ? `Primær kontakt · ${primaryContactRelation}`
                      : 'Primær kontakt',
                    v: primaryContact,
                  },
                  { k: 'Sidst check-in', v: lastCheckin },
                  { k: 'Stemning', v: moodScore !== null ? `${moodScore}/10` : null },
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
                      {cell.v ?? (
                        <span
                          style={{
                            color: 'var(--cp-muted)',
                            fontSize: '0.75rem',
                            fontStyle: 'italic',
                          }}
                        >
                          Ikke registreret
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {primaryContactPhone && (
              <div className="mt-3">
                <a
                  href={`tel:${primaryContactPhone.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-90"
                  style={{ color: 'var(--cp-green)' }}
                >
                  <Phone size={14} aria-hidden />
                  {primaryContactPhone}
                </a>
              </div>
            )}

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
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
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
              <Link
                href="/handover-workspace"
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
              >
                <FilePenLine className="h-3.5 w-3.5" aria-hidden />
                Skriv vagtnotat
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

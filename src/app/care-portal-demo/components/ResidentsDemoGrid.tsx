'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Search, X } from 'lucide-react';
import { CARE_DEMO_RESIDENT_PROFILES, careDemoProfileById } from '@/lib/careDemoResidents';

type TrafficUi = 'groen' | 'gul' | 'roed';

type Row = {
  id: string;
  name: string;
  initials: string;
  room: string;
  trafficLight: TrafficUi | null;
  checkinToday: boolean;
  notePreview: string;
};

const SEED: Row[] = CARE_DEMO_RESIDENT_PROFILES.slice(0, 8).map((r, i) => ({
  id: r.id,
  name: r.displayName,
  initials: r.initials,
  room: r.room,
  trafficLight: (['groen', 'gul', 'roed', 'groen', null, 'gul', 'groen', 'roed'] as const)[
    i
  ] as TrafficUi | null,
  checkinToday: i % 3 !== 0,
  notePreview:
    i === 1
      ? 'Kriseplan gennemgået i nat. Sover uroligt.'
      : i === 3
        ? 'Let angst før gruppe — deltog efter tilvænning.'
        : 'Ingen særlige bemærkninger.',
}));

const DOT: Record<TrafficUi, string> = {
  groen: 'var(--cp-green)',
  gul: 'var(--cp-amber)',
  roed: 'var(--cp-red)',
};

const TAB_LABEL: Record<string, string> = {
  overview: 'Oversigt',
  notes: 'Journal',
  goals: 'Handleplan',
  medication: 'Medicin',
};

const TAB_BLURB: Record<string, string> = {
  overview:
    'Samlet status, pårørende og kommende aftaler. I produktion åbnes beboerens fulde 360°-profil her.',
  notes:
    'Journalnotater og bekymringsnotater samlet. Demo-data matcher søgeresultater fra topbaren — intet gemmes.',
  goals:
    'Handleplan og mål opdateres af tværfagligt team. Her vises et uddrag som i den rigtige portal.',
  medication:
    'Medicinkort, dosering og PRN. Link fra dokumentsøgning lander på den tilsvarende fane (demo).',
};

export default function ResidentsDemoGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusResident = searchParams.get('resident');
  const focusTab = searchParams.get('tab') ?? 'overview';

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'alle' | TrafficUi | 'ingen'>('alle');

  const focusProfile = focusResident ? careDemoProfileById(focusResident) : undefined;
  const tabTitle = TAB_LABEL[focusTab] ?? focusTab;
  const tabBlurb = TAB_BLURB[focusTab] ?? TAB_BLURB.overview;

  useEffect(() => {
    if (!focusResident) return;
    const t = window.setTimeout(() => {
      document.getElementById(`demo-resident-row-${focusResident}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100);
    return () => clearTimeout(t);
  }, [focusResident]);

  const filtered = useMemo(() => {
    return SEED.filter((r) => {
      const q = search.toLowerCase();
      const match = r.name.toLowerCase().includes(q) || r.room.toLowerCase().includes(q);
      const f =
        filter === 'alle' ? true : filter === 'ingen' ? !r.trafficLight : r.trafficLight === filter;
      return match && f;
    });
  }, [search, filter]);

  const checkinCount = SEED.filter((r) => r.checkinToday).length;
  const redCount = SEED.filter((r) => r.trafficLight === 'roed').length;

  return (
    <div className="mx-auto max-w-screen-xl p-6">
      <div className="mb-6">
        <h1
          className="text-xl font-semibold"
          style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cp-text)' }}
        >
          Beboere
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--cp-muted)' }}>
          {SEED.length} beboere · {checkinCount} check-in i dag
          {redCount > 0 && (
            <span style={{ color: 'var(--cp-red)', marginLeft: 8 }}>
              · {redCount} rødt trafiklys
            </span>
          )}
        </p>
      </div>

      {focusResident && focusProfile ? (
        <div
          className="mb-4 rounded-xl border px-4 py-3"
          style={{
            borderColor: 'rgba(45,212,160,0.28)',
            backgroundColor: 'var(--cp-bg2)',
            boxShadow: '0 0 0 1px rgba(45,212,160,0.08)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(110,231,183,0.95), rgba(5,150,105,0.9))',
                }}
              >
                <FileText className="h-4 w-4 opacity-90" aria-hidden />
              </div>
              <div className="min-w-0">
                <p
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--cp-muted2)' }}
                >
                  Fra dokumentsøgning · demo
                </p>
                <h2 className="text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
                  {focusProfile.displayName}
                </h2>
                <p className="text-sm" style={{ color: 'var(--cp-green)' }}>
                  Fane: {tabTitle}
                </p>
                <p
                  className="mt-1 max-w-prose text-sm leading-relaxed"
                  style={{ color: 'var(--cp-muted)' }}
                >
                  {tabBlurb}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/care-portal-demo/residents')}
              className="flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)]"
              style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Luk
            </button>
          </div>
        </div>
      ) : null}

      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <div
          className="flex flex-wrap items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: 'var(--cp-border)' }}
        >
          <div className="relative max-w-xs flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--cp-muted2)' }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg navn eller værelse…"
              className="w-full rounded-lg border py-2 pl-8 pr-3 text-sm outline-none focus:border-[#1D9E75]"
              style={{
                borderColor: 'var(--cp-border)',
                backgroundColor: 'var(--cp-bg3)',
                color: 'var(--cp-text)',
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(['alle', 'roed', 'gul', 'groen', 'ingen'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="rounded-lg px-3 py-2 text-xs font-medium transition-all"
                style={
                  filter === f
                    ? { backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }
                    : { color: 'var(--cp-muted)', backgroundColor: 'var(--cp-bg3)' }
                }
              >
                {f === 'alle'
                  ? 'Alle'
                  : f === 'ingen'
                    ? 'Ingen'
                    : f === 'groen'
                      ? 'Grøn'
                      : f === 'gul'
                        ? 'Gul'
                        : 'Rød'}
              </button>
            ))}
          </div>
        </div>

        <ul className="divide-y" style={{ borderColor: 'var(--cp-border)' }}>
          {filtered.map((r) => (
            <li
              key={r.id}
              id={`demo-resident-row-${r.id}`}
              className={`flex cursor-default items-center gap-4 px-4 py-3 transition-colors hover:bg-[rgba(255,255,255,0.02)] ${
                focusResident === r.id
                  ? 'ring-1 ring-inset ring-[rgba(45,212,160,0.35)] bg-[rgba(45,212,160,0.06)]'
                  : ''
              }`}
            >
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{
                  background:
                    r.trafficLight === 'roed'
                      ? 'linear-gradient(135deg,#f56565,#c53030)'
                      : r.trafficLight === 'gul'
                        ? 'linear-gradient(135deg,#f6ad55,#c05621)'
                        : 'linear-gradient(135deg,#2dd4a0,#0d9488)',
                }}
              >
                {r.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: 'var(--cp-text)' }}>
                    {r.name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    værelse {r.room}
                  </span>
                  {r.trafficLight && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: DOT[r.trafficLight] }}
                      title={r.trafficLight}
                    />
                  )}
                </div>
                <p className="truncate text-xs" style={{ color: 'var(--cp-muted)' }}>
                  {r.notePreview}
                </p>
              </div>
              <div
                className="hidden text-right text-xs sm:block"
                style={{ color: 'var(--cp-muted2)' }}
              >
                {r.checkinToday ? 'Check-in i dag' : 'Ikke checket ind'}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

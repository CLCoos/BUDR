'use client';

import React from 'react';
import Link from 'next/link';

/** Højre kolonne på demo-forsiden: frister og (som eksempel) forbindelser til andre systemer. */

const DEADLINES = [
  {
    date: 'Om 6 dage',
    title: 'Statusudtalelse til kommunen',
    who: 'SK · kontaktperson Peter N.',
    state: 'Udkast klar',
    warn: true,
    href: '/care-portal-demo/dokumenter',
  },
  {
    date: 'Om 13 dage',
    title: 'Opfølgning på handleplan',
    who: 'CB · kontaktperson Peter N.',
    state: 'Ikke startet',
  },
  {
    date: 'Fredag',
    title: 'Lægesamtale om aftenmedicin',
    who: 'MT · kontaktperson Lars N.',
    state: 'Forberedelse klar',
  },
];

const CONNECTIONS = [
  { name: 'FMK', state: 'Medicinkort hentet i nat' },
  { name: 'MedCom', state: '2 nye beskeder' },
  { name: 'Sensum / Nexus', state: '11 notater overført i dag' },
  { name: 'MitID Erhverv', state: 'Log ind for alle medarbejdere' },
  { name: 'Lys-appen', state: '5 af 6 borgere aktive' },
  { name: 'Sikker post', state: 'Til kommunen via e-Boks' },
];

const card = {
  backgroundColor: 'var(--cp-card-bg)',
  borderColor: 'var(--cp-border)',
} as const;

export default function DemoSidePanels() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="rounded-2xl border" style={card} aria-labelledby="demo-frister">
        <h2
          id="demo-frister"
          className="border-b px-5 py-4 text-base font-semibold"
          style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
        >
          Frister de næste 30 dage
        </h2>
        <ul>
          {DEADLINES.map((d) => {
            const inner = (
              <>
                <span
                  className="text-[13px] font-medium"
                  style={{ color: d.warn ? 'var(--cp-amber)' : 'var(--cp-muted)' }}
                >
                  {d.date}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                    {d.title}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    {d.who}
                  </span>
                </span>
                <span className="text-right text-xs" style={{ color: 'var(--cp-muted)' }}>
                  {d.state}
                </span>
              </>
            );
            const cls =
              'grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-3 border-b px-5 py-3';
            return (
              <li key={d.title} className="[&:last-child>*]:border-b-0">
                {d.href ? (
                  <Link
                    href={d.href}
                    className={`${cls} hover:bg-[var(--cp-bg3)]`}
                    style={{ borderColor: 'var(--cp-border)' }}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className={cls} style={{ borderColor: 'var(--cp-border)' }}>
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border" style={card} aria-labelledby="demo-forbindelser">
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4"
          style={{ borderColor: 'var(--cp-border)' }}
        >
          <h2
            id="demo-forbindelser"
            className="text-base font-semibold"
            style={{ color: 'var(--cp-text)' }}
          >
            Forbindelser
          </h2>
          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
            style={{ backgroundColor: 'var(--cp-amber-dim)', color: 'var(--cp-amber)' }}
          >
            Eksempel på fuld drift
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
          {CONNECTIONS.map((c) => (
            <div
              key={c.name}
              className="flex min-w-0 flex-col gap-0.5 rounded-[10px] border px-3 py-2.5"
              style={{ borderColor: 'var(--cp-border)' }}
            >
              <span className="text-[13px] font-semibold" style={{ color: 'var(--cp-text)' }}>
                {c.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                {c.state}
              </span>
            </div>
          ))}
        </div>
        <p className="px-5 pb-4 text-xs leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
          Sådan ser det ud, når integrationerne er sat op. I dag virker kopiering til fagsystemet;
          resten er på vejen.
        </p>
      </section>
    </div>
  );
}

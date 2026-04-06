'use client';

import React, { useState } from 'react';
import { MessageSquare, Users, HeartHandshake } from 'lucide-react';

type Intern = { id: string; from: string; time: string; preview: string; unread?: boolean };
type Lys = {
  id: string;
  resident: string;
  requested?: string;
  preview: string;
  time: string;
};

const INTERN: Intern[] = [
  {
    id: 'i1',
    from: 'Vagtleder · Mikkel H.',
    time: 'I dag 08:12',
    preview: 'Husk fællesmøde kl. 13 — kort status på medicinændringer.',
    unread: true,
  },
  {
    id: 'i2',
    from: 'Administration',
    time: 'I går',
    preview: 'Nye retningslinjer for dokumentation i CosDoc er lagt i den delte mappe.',
  },
  {
    id: 'i3',
    from: 'Sosu · Hanne B.',
    time: 'I går',
    preview: 'Kan du tage opfølgning på værelse 103 efter aftensmad? Jeg smutter tidligt.',
  },
];

const LYS: Lys[] = [
  {
    id: 'l1',
    resident: 'Finn L.',
    requested: 'Sara K.',
    time: 'I dag 07:45',
    preview:
      'Via Lys: «Jeg vil gerne tale med Sara om i går aftes — jeg blev bange da det larmede.»',
  },
  {
    id: 'l2',
    resident: 'Kirsten R.',
    time: 'I går 21:10',
    preview:
      'Kort stemningscheck: 4/10. Ønsker ikke samtale i dag, bare vide at nogen så beskeden.',
  },
  {
    id: 'l3',
    resident: 'Maja T.',
    requested: 'Morten L. (ikke på vagt)',
    time: 'For 2 dage siden',
    preview: 'Spørgsmål om tur næste uge — viderestilles når Morten er på.',
  },
];

export default function BeskederDemoClient() {
  const [tab, setTab] = useState<'intern' | 'lys'>('intern');

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1
        className="text-xl font-semibold"
        style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cp-text)' }}
      >
        Beskeder
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
        Internt team · Signaler fra Lys med korte opsummeringer (demo).
      </p>

      <div
        className="mt-6 flex rounded-xl border p-1"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <button
          type="button"
          onClick={() => setTab('intern')}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors"
          style={
            tab === 'intern'
              ? { backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }
              : { color: 'var(--cp-muted)' }
          }
        >
          <Users size={16} />
          Internt
        </button>
        <button
          type="button"
          onClick={() => setTab('lys')}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors"
          style={
            tab === 'lys'
              ? { backgroundColor: 'var(--cp-blue-dim)', color: 'var(--cp-blue)' }
              : { color: 'var(--cp-muted)' }
          }
        >
          <HeartHandshake size={16} />
          Fra Lys
        </button>
      </div>

      {tab === 'intern' && (
        <ul className="mt-6 space-y-2">
          {INTERN.map((m) => (
            <li
              key={m.id}
              className="cursor-pointer rounded-xl border p-4 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
              style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
            >
              <div className="flex items-start gap-3">
                <MessageSquare
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: 'var(--cp-muted)' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                      {m.from}
                    </span>
                    {m.unread && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{ backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' }}
                      >
                        Ny
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                      {m.time}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
                    {m.preview}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'lys' && (
        <ul className="mt-6 space-y-2">
          {LYS.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border p-4"
              style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#7F77DD,#5E56C0)' }}
                >
                  Lys
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                    {m.resident}
                    {m.requested && (
                      <span className="font-normal" style={{ color: 'var(--cp-muted)' }}>
                        {' '}
                        · ønsker kontakt:{' '}
                        <span style={{ color: 'var(--cp-amber)' }}>{m.requested}</span>
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
                    {m.preview}
                  </p>
                  <p className="mt-2 text-xs" style={{ color: 'var(--cp-muted2)' }}>
                    {m.time}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs leading-relaxed" style={{ color: 'var(--cp-muted2)' }}>
        Forslag: fremtidigt kan beskeder kobles på vagtplan (hvem er på når en borger ønsker en
        bestemt medarbejder) og vises som diskret badge i headeren.
      </p>
    </div>
  );
}

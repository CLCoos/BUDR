'use client';

import React, { useMemo, useState } from 'react';
import { Check, ClipboardCopy } from 'lucide-react';
import {
  formatNoteForFagsystem,
  formatNotesForFagsystem,
  groupNotesByResident,
  noteHeader,
  type FagsystemNote,
} from '@/lib/fagsystem/format';
import { copyText } from '@/lib/fagsystem/client';

/** Demo af «Til fagsystem»: fiktive godkendte notater, kopiering virker, markeringer er lokale. */

const NAMES: Record<string, string> = {
  'res-sara': 'Sara Kristensen',
  'res-anders': 'Anders Pedersen',
  'res-camilla': 'Camilla Birk',
};

function daysAgo(d: number, h: number, m = 0): string {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, m, 0, 0);
  return t.toISOString();
}

const NOTES: FagsystemNote[] = [
  {
    id: 'n1',
    resident_id: 'res-anders',
    staff_name: 'Lars N.',
    category: 'Sundhed',
    created_at: daysAgo(1, 10, 20),
    entry_text:
      'Anders var hos egen læge. Såret på underbenet er ikke helet, og lægen har udskrevet en ny creme. Kontrol om 14 dage.',
  },
  {
    id: 'n2',
    resident_id: 'res-sara',
    staff_name: 'Peter N.',
    category: 'Pædagogisk',
    created_at: daysAgo(1, 14, 5),
    entry_text:
      'Sara og jeg handlede ind efter liste (delmål 1). Hun klarede det selv og var stolt bagefter.',
  },
  {
    id: 'n3',
    resident_id: 'res-camilla',
    staff_name: 'Lars N.',
    category: 'Døgnnotat',
    created_at: daysAgo(2, 19, 40),
    entry_text: 'Camilla meldte gul i Lys. Vi tog en snak, og hun faldt til ro. Sov kl. 23.',
  },
  {
    id: 'n4',
    resident_id: 'res-sara',
    staff_name: 'Lars N.',
    category: 'Døgnnotat',
    created_at: daysAgo(3, 20, 0),
    entry_text: 'Rolig aften. Sara spiste med i fællesskabet og så film.',
  },
];

type Filter = 'mangler' | 'overfoert' | 'alle';

export default function DemoFagsystemClient() {
  const [transferred, setTransferred] = useState<Record<string, boolean>>({ n4: true });
  const [filter, setFilter] = useState<Filter>('mangler');
  const [withHeader, setWithHeader] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);

  const shown = useMemo(
    () =>
      NOTES.filter((n) =>
        filter === 'alle' ? true : filter === 'overfoert' ? transferred[n.id] : !transferred[n.id]
      ),
    [filter, transferred]
  );
  const groups = groupNotesByResident(shown, (id) => NAMES[id] ?? 'Borger');
  const missing = NOTES.filter((n) => !transferred[n.id]).length;

  const copy = async (notes: FagsystemNote[], key: string) => {
    const text =
      notes.length === 1
        ? formatNoteForFagsystem(notes[0]!, withHeader)
        : formatNotesForFagsystem(notes, withHeader);
    if (!(await copyText(text))) return;
    setTransferred((t) => ({ ...t, ...Object.fromEntries(notes.map((n) => [n.id, true])) }));
    setFlash(key);
    setTimeout(() => setFlash(null), 2000);
  };

  const tabs: { id: Filter; label: string }[] = [
    { id: 'mangler', label: `Mangler (${missing})` },
    { id: 'overfoert', label: 'Overført' },
    { id: 'alle', label: 'Alle' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 p-4 pb-24 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-1.5">
        <p className="text-[13px]" style={{ color: 'var(--cp-muted)' }}>
          Godkendte notater fra de sidste 14 dage
        </p>
        <h1
          className="m-0"
          style={{
            fontSize: 'clamp(24px, 3.2vw, 32px)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--cp-text)',
          }}
        >
          Til fagsystem
        </h1>
        <p className="max-w-[68ch] text-sm" style={{ color: 'var(--cp-muted)' }}>
          BUDR er jeres pædagogiske arbejdsredskab. Notaterne kopieres som ren tekst, så de kan
          sættes direkte ind i Sensum, Nexus eller jeres andet fagsystem.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Vis notater"
          className="inline-flex rounded-[10px] border p-1"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              className="min-h-[36px] rounded-lg px-3 text-[13px] font-medium"
              style={{
                backgroundColor: filter === t.id ? 'var(--cp-text)' : 'transparent',
                color: filter === t.id ? 'var(--cp-bg)' : 'var(--cp-muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm"
          style={{ color: 'var(--cp-text)' }}
        >
          <input
            type="checkbox"
            checked={withHeader}
            onChange={(e) => setWithHeader(e.target.checked)}
            className="h-5 w-5"
            style={{ accentColor: 'var(--cp-green)' }}
          />
          Medtag dato og forfatter
        </label>
      </div>

      {groups.length === 0 && (
        <p
          className="rounded-2xl border px-5 py-8 text-center text-sm"
          style={{
            borderColor: 'var(--cp-border)',
            backgroundColor: 'var(--cp-card-bg)',
            color: 'var(--cp-muted)',
          }}
        >
          Alt er overført. Godt gået.
        </p>
      )}

      {groups.map((g) => (
        <section
          key={g.residentId}
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-card-bg)' }}
          aria-label={g.name}
        >
          <div
            className="flex flex-wrap items-center gap-3 border-b px-5 py-4"
            style={{ borderColor: 'var(--cp-border)' }}
          >
            <h2 className="m-0 text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
              {g.name}
            </h2>
            <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              {g.notes.length} {g.notes.length === 1 ? 'notat' : 'notater'}
            </span>
            {g.notes.length > 1 && (
              <button
                type="button"
                onClick={() => void copy(g.notes, g.residentId)}
                className="ml-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-4 text-[13px] font-semibold"
                style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
              >
                {flash === g.residentId ? (
                  <Check size={15} aria-hidden />
                ) : (
                  <ClipboardCopy size={15} aria-hidden />
                )}
                {flash === g.residentId ? 'Kopieret' : 'Kopiér alle'}
              </button>
            )}
          </div>
          <ul>
            {g.notes.map((n) => (
              <li
                key={n.id}
                className="flex flex-col gap-2 border-b px-5 py-4 last:border-b-0 sm:flex-row sm:items-start sm:gap-4"
                style={{ borderColor: 'var(--cp-border)' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    {noteHeader(n)}
                  </p>
                  <p
                    className="mt-1 text-[15px] leading-relaxed"
                    style={{ color: 'var(--cp-text)' }}
                  >
                    {n.entry_text}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void copy([n], n.id)}
                  className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 self-start rounded-[10px] border px-3 text-[13px] font-medium"
                  style={{
                    borderColor: transferred[n.id] ? 'transparent' : 'var(--cp-border2)',
                    color: transferred[n.id] ? 'var(--cp-green)' : 'var(--cp-text)',
                    backgroundColor: transferred[n.id] ? 'var(--cp-green-dim)' : 'var(--cp-bg2)',
                  }}
                >
                  {transferred[n.id] || flash === n.id ? (
                    <Check size={14} aria-hidden />
                  ) : (
                    <ClipboardCopy size={14} aria-hidden />
                  )}
                  {flash === n.id ? 'Kopieret' : transferred[n.id] ? 'Overført' : 'Kopiér'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

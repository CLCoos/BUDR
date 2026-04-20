'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Heart, Users } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';

export type ShiftStaff = {
  id: string;
  first: string;
  lastInitial: string;
  avatarBg: string;
  initials: string;
  kontaktperson?: boolean;
  /** Kun for live-data fra portalen */
  phone?: string;
};

export type ShiftBlock = {
  label: string;
  hours: string;
  staff: ShiftStaff[];
  current?: boolean;
};

type ApiShift = 'day' | 'evening' | 'night';

type ApiItem = {
  shift: ApiShift;
  phone: string;
  staffId: string;
  staffName: string | null;
};

const SHIFT_META: Record<ApiShift, { label: string; hours: string; order: number }> = {
  day: { label: 'Dagvagt', hours: 'ca. 06–14', order: 0 },
  evening: { label: 'Aftenvagt', hours: 'ca. 14–22', order: 1 },
  night: { label: 'Nattevagt', hours: 'ca. 22–06', order: 2 },
};

const AVATAR_PALETTE = ['#7F77DD', '#1D9E75', '#F59E0B', '#6366F1', '#EC4899', '#0EA5E9'];

function hashHue(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]!;
}

function formatStaffName(full: string | null): {
  first: string;
  lastInitial: string;
  initials: string;
} {
  if (!full?.trim()) {
    return { first: 'Vagthavende', lastInitial: '', initials: '?' };
  }
  const parts = full.trim().split(/\s+/);
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  const lastInitial = last ? `${last[0] ?? ''}.` : '';
  const initials = `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase() || '?';
  return { first, lastInitial, initials };
}

function currentShiftKey(): ApiShift {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 'day';
  if (hour >= 14 && hour < 22) return 'evening';
  return 'night';
}

const MOCK_DAY: ShiftBlock[] = [
  {
    label: 'Dagvagt',
    hours: '07:00–15:00',
    current: true,
    staff: [
      {
        id: '1',
        first: 'Sara',
        lastInitial: 'K.',
        initials: 'SK',
        avatarBg: '#C4B5FD',
        kontaktperson: true,
      },
      {
        id: '2',
        first: 'Michael',
        lastInitial: 'T.',
        initials: 'MT',
        avatarBg: '#93C5FD',
      },
    ],
  },
  {
    label: 'Aftenvagt',
    hours: '15:00–23:00',
    staff: [
      { id: '3', first: 'Louise', lastInitial: 'B.', initials: 'LB', avatarBg: '#FCA5A5' },
      { id: '4', first: 'Jonas', lastInitial: 'M.', initials: 'JM', avatarBg: '#86EFAC' },
    ],
  },
  {
    label: 'Nattevagt',
    hours: '22:00–07:00',
    staff: [{ id: '5', first: 'Pernille', lastInitial: 'A.', initials: 'PA', avatarBg: '#FCD34D' }],
  },
];

const MOCK_WEEK = [
  { key: 'man', label: 'Man 24/3', pills: ['SK', 'MT', 'LB'] },
  { key: 'tir', label: 'Tir 25/3', pills: ['JM', 'PA'] },
  { key: 'ons', label: 'Ons 26/3', pills: ['SK', 'LB'] },
  { key: 'tor', label: 'Tor 27/3', pills: ['MT', 'JM'] },
  { key: 'fre', label: 'Fre 28/3', pills: ['SK', 'MT'] },
  { key: 'lør', label: 'Lør 29/3', pills: ['LB', 'PA'] },
  { key: 'søn', label: 'Søn 30/3', pills: ['SK', 'JM'] },
];

function itemsToBlocks(items: ApiItem[]): ShiftBlock[] {
  const cur = currentShiftKey();
  const sorted = [...items].sort((a, b) => SHIFT_META[a.shift].order - SHIFT_META[b.shift].order);
  return sorted.map((it) => {
    const meta = SHIFT_META[it.shift];
    const { first, lastInitial, initials } = formatStaffName(it.staffName);
    return {
      label: meta.label,
      hours: meta.hours,
      current: it.shift === cur,
      staff: [
        {
          id: it.staffId,
          first,
          lastInitial,
          initials,
          avatarBg: hashHue(it.staffId),
          kontaktperson: it.shift === cur,
          phone: it.phone?.trim() || undefined,
        },
      ],
    };
  });
}

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  reducedMotion: boolean;
  facilityId: string | null;
  isDemoMode?: boolean;
  onBack?: () => void;
  /** Tom tilstand: åbn kalender-fanen */
  onOpenCalendar?: () => void;
};

export default function LysVagtplan({
  tokens,
  accent,
  reducedMotion,
  facilityId,
  isDemoMode = false,
  onBack,
  onOpenCalendar,
}: Props) {
  const dur = reducedMotion ? 0 : 300;
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(Boolean(facilityId && !isDemoMode));
  const [apiItems, setApiItems] = useState<ApiItem[] | null>(null);

  const load = useCallback(async () => {
    if (isDemoMode || !facilityId) {
      setApiItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/park/resident-on-call', { credentials: 'include' });
      const data = (await res.json()) as { items?: ApiItem[] };
      setApiItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setApiItems([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, isDemoMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const blocks = useMemo(() => {
    if (isDemoMode) return MOCK_DAY;
    if (!facilityId) return [];
    if (loading || apiItems === null) return [];
    if (apiItems.length === 0) return [];
    return itemsToBlocks(apiItems);
  }, [apiItems, facilityId, isDemoMode, loading]);

  const showWeekDemo = isDemoMode;

  const isDark = tokens.colorScheme === 'dark';
  const badgeOn = isDark ? 'rgba(29,158,117,0.22)' : '#dcfce7';
  const badgeText = isDark ? '#6ee7b7' : '#166534';

  const inner = (
    <section
      className="rounded-2xl border p-6 shadow-sm transition-all"
      style={{
        transitionDuration: `${dur}ms`,
        backgroundColor: tokens.cardBg,
        borderColor: tokens.cardBorder,
        color: tokens.text,
      }}
      aria-labelledby="lys-vagtplan-heading"
    >
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 shrink-0" style={{ color: accent }} aria-hidden />
        <h2 id="lys-vagtplan-heading" className="text-lg font-semibold">
          Vagtplan i dag
        </h2>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: tokens.textMuted }}>
          Henter vagter fra bostedet…
        </p>
      ) : null}

      {!loading && blocks.length === 0 && !isDemoMode && facilityId && apiItems !== null ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
            Der er ikke lagt vagthavende ind for i dag i Care Portal endnu. Når personalet udfylder
            vagtplanen, vises navn og telefon her.
          </p>
          {onOpenCalendar ? (
            <button
              type="button"
              onClick={onOpenCalendar}
              className="min-h-[44px] w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ backgroundColor: tokens.accentSoft, color: accent }}
            >
              Gå til dagens program (kalender)
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && blocks.length > 0 ? (
        <div className="space-y-5">
          {blocks.map((block) => (
            <div key={block.label}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold" style={{ color: tokens.text }}>
                  {block.label}
                </p>
                <span className="text-base opacity-60" style={{ color: tokens.textMuted }}>
                  ({block.hours})
                </span>
                {block.current ? (
                  <span
                    className="rounded-full px-2 py-1 text-sm font-medium"
                    style={{ backgroundColor: badgeOn, color: badgeText }}
                  >
                    Dette skift nu
                  </span>
                ) : null}
              </div>
              <ul className="flex flex-col gap-4">
                {block.staff.map((s) => (
                  <li key={s.id} className="flex min-w-[44px] items-center gap-3">
                    <div
                      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white transition-transform"
                      style={{
                        width: s.kontaktperson ? 40 : 36,
                        height: s.kontaktperson ? 40 : 36,
                        backgroundColor: s.avatarBg,
                        fontSize: s.kontaktperson ? 13 : 12,
                        boxShadow: block.current ? `0 0 0 3px ${accent}55` : undefined,
                      }}
                      aria-hidden
                    >
                      {s.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="flex flex-wrap items-center gap-1 text-base font-semibold"
                        style={{ color: tokens.text }}
                      >
                        {s.first} {s.lastInitial}
                        {s.kontaktperson ? (
                          <span className="inline-flex" title="Vagthavende på dette skift">
                            <Heart
                              className="h-4 w-4 shrink-0 text-rose-400"
                              aria-label="Vagthavende"
                            />
                          </span>
                        ) : null}
                      </p>
                      {!isDemoMode && s.phone ? (
                        <p className="mt-1 text-sm" style={{ color: tokens.textMuted }}>
                          <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="underline">
                            Ring {s.phone}
                          </a>
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {isDemoMode ? (
        <p className="mt-4 text-xs" style={{ color: tokens.textMuted }}>
          Demo: Eksempeldata — i drift hentes vagter fra Care Portal (`on_call_staff`).
        </p>
      ) : null}

      {showWeekDemo ? (
        <>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold transition-colors"
            style={{ color: accent, backgroundColor: tokens.accentSoft }}
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                Skjul demo-uge <ChevronUp className="h-5 w-5" aria-hidden />
              </>
            ) : (
              <>
                Se demo-uge <ChevronDown className="h-5 w-5" aria-hidden />
              </>
            )}
          </button>

          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{
              gridTemplateRows: expanded ? '1fr' : '0fr',
            }}
          >
            <div className="overflow-hidden">
              <ul
                className="mt-4 space-y-2 border-t pt-4 text-base"
                style={{ borderColor: tokens.cardBorder }}
              >
                {MOCK_WEEK.map((row) => (
                  <li key={row.key} className="flex flex-wrap items-center gap-2">
                    <span
                      className="w-24 shrink-0 font-medium opacity-80"
                      style={{ color: tokens.textMuted }}
                    >
                      {row.label}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {row.pills.map((p) => (
                        <span
                          key={p}
                          className="rounded-full px-2 py-1 font-mono text-sm font-semibold text-white"
                          style={{ backgroundColor: accent }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );

  if (onBack) {
    return (
      <div
        className="min-h-dvh px-4 py-6 sm:px-5"
        style={{
          backgroundColor: tokens.bg,
          color: tokens.text,
          paddingBottom: 'max(6rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="mb-6 min-h-[44px] text-lg opacity-90"
          style={{ color: tokens.textMuted }}
        >
          ← Tilbage
        </button>
        {inner}
      </div>
    );
  }

  return inner;
}

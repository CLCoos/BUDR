'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookHeart,
  BookOpen,
  CalendarCheck,
  Camera,
  Flower2,
  Moon,
  Sun,
  Target,
  Volume2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useResidentSession } from '@/hooks/useResidentSession';
import * as dataService from '@/lib/dataService';
import { moodBarsFromLocalCheckins } from '@/lib/lysCheckinHistory';
import { LYS_QUICK_MOODS } from '@/lib/lys/iDag';
import { isResidentUuidForCloud } from '@/lib/residentUuid';
import { getResidentBadgeDef, normalizeBadgeKeyForDisplay } from '@/lib/residentBadges';
import { useResident } from '../context/ResidentContext';
import type { LysThemeTokens } from '../lib/lysTheme';
import type { LysFlowOverlay } from '../lib/lysOverlay';
import { LysCard, LysLabel, LysLinkRow, lysMoodColors } from './lysUi';

type MoodPoint = { date: string; label: string; value: number | null; dayName: string };
type BadgeRow = { badge_key: string; earned_at: string };

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  initials: string;
  appearance: 'light' | 'dark';
  onToggleAppearance: () => void;
  onOpen: (overlay: LysFlowOverlay) => void;
  onLogout: () => void;
};

/** Point-milepæle hører til det gamle pointsystem og vises ikke længere. */
function isQuietMilestone(key: string): boolean {
  return !key.startsWith('xp_');
}

/** 1–10 eller 1–5 → plads i de fem humørfarver (0 = rigtig godt, 4 = meget svært). */
function moodIndex(val: number): number {
  const pct = val > 5 ? val / 10 : val / 5;
  if (pct >= 0.85) return 0;
  if (pct >= 0.65) return 1;
  if (pct >= 0.45) return 2;
  if (pct >= 0.25) return 3;
  return 4;
}

/**
 * «Min vej»: mål, dagbog, historier og ressourceblomst samlet. Ingen point eller niveauer,
 * kun stille milepæle, der ikke kan gå tabt.
 */
export default function LysMinVej({
  tokens,
  accent,
  firstName,
  initials,
  appearance,
  onToggleAppearance,
  onOpen,
  onLogout,
}: Props) {
  const router = useRouter();
  const { residentId } = useResident();
  const session = useResidentSession();
  const mode = session.storageMode;
  const activeId = session.activeId || residentId;
  const cloud = mode === 'supabase' && isResidentUuidForCloud(session.activeId);
  const checkinId = cloud ? session.activeId : residentId || session.activeId;
  const dark = tokens.colorScheme === 'dark';
  const moodColors = lysMoodColors(dark);

  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [moodHistory, setMoodHistory] = useState<MoodPoint[]>([]);
  const [selectedDay, setSelectedDay] = useState<MoodPoint | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [nickname, setNickname] = useState('');
  const [editingNick, setEditingNick] = useState(false);
  const [savingNick, setSavingNick] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeId) return;
    void dataService.getBadges(mode, activeId).then((d) => setBadges(d as BadgeRow[]));
    void dataService.getProfile(mode, activeId).then((p) => {
      if (p.nickname) setNickname(p.nickname);
    });
    if (cloud) {
      void fetch('/api/lys/resident-me', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { avatar_url?: string | null } | null) => {
          if (d?.avatar_url) setAvatarUrl(d.avatar_url);
        })
        .catch(() => undefined);
    }
  }, [activeId, mode, cloud]);

  useEffect(() => {
    if (!checkinId) return;
    let cancelled = false;
    void dataService.getCheckins(cloud ? 'supabase' : 'local', checkinId).then((checkins) => {
      if (!cancelled) setMoodHistory(moodBarsFromLocalCheckins(checkins, { days: 14 }));
    });
    return () => {
      cancelled = true;
    };
  }, [checkinId, cloud]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !residentId || !cloud) return;
    setUploadingAvatar(true);
    const supabase = createClient();
    if (!supabase) {
      setUploadingAvatar(false);
      return;
    }
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `avatars/${residentId}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      setAvatarUrl(url);
      await fetch('/api/lys/resident-me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatar_url: url }),
      });
    }
    setUploadingAvatar(false);
  };

  const saveNickname = async () => {
    if (!activeId) return;
    setSavingNick(true);
    await dataService.saveProfile(mode, activeId, { nickname });
    setSavingNick(false);
    setEditingNick(false);
  };

  // Én række pr. milepæl, den første gang den blev nået.
  const firstEarned = new Map<string, string>();
  for (const r of [...badges].sort((a, b) => a.earned_at.localeCompare(b.earned_at))) {
    const key = normalizeBadgeKeyForDisplay(r.badge_key);
    if (isQuietMilestone(key) && !firstEarned.has(key)) firstEarned.set(key, r.earned_at);
  }
  const milestones = [...firstEarned.entries()]
    .map(([key, at]) => ({ def: getResidentBadgeDef(key), at }))
    .filter((m): m is { def: NonNullable<typeof m.def>; at: string } => !!m.def)
    .reverse();

  const hasMood = moodHistory.some((d) => d.value !== null);

  return (
    <div className="flex flex-col gap-4 px-5 pb-8 pt-5" style={{ color: tokens.text }}>
      {/* ── Mig ─────────────────────────────────────────────── */}
      <header className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div
            className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full text-[24px] font-bold"
            style={{ backgroundColor: tokens.accentSoft, color: tokens.accentSoftText }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials || 'B'
            )}
          </div>
          {cloud && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: accent, boxShadow: `0 0 0 3px ${tokens.bg}` }}
                aria-label="Skift profilbillede"
              >
                <Camera size={15} aria-hidden />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleAvatarUpload(e)}
              />
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {editingNick ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                aria-label="Det, Lys skal kalde dig"
                className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-[18px] font-semibold outline-none"
                style={{
                  backgroundColor: tokens.cardBg,
                  borderColor: tokens.cardBorder,
                  color: tokens.text,
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => void saveNickname()}
                disabled={savingNick}
                className="min-h-[44px] rounded-xl px-4 text-[15px] font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                Gem
              </button>
            </div>
          ) : (
            <>
              <h1 className="truncate text-[28px] font-bold leading-tight tracking-[-0.02em]">
                {nickname || firstName || 'Min vej'}
              </h1>
              <button
                type="button"
                onClick={() => setEditingNick(true)}
                className="min-h-[32px] text-sm font-medium underline underline-offset-4"
                style={{ color: tokens.textMuted }}
              >
                Skift hvad Lys kalder dig
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Mine ting ───────────────────────────────────────── */}
      <LysCard tokens={tokens} labelledBy="lys-vej-ting">
        <LysLabel tokens={tokens} id="lys-vej-ting">
          Mine ting
        </LysLabel>
        <div className="flex flex-col">
          <LysLinkRow
            tokens={tokens}
            icon={<Target size={18} />}
            title="Mine mål"
            sub="Det, du arbejder hen imod"
            onClick={() => onOpen('goals')}
          />
          <LysLinkRow
            tokens={tokens}
            icon={<BookHeart size={18} />}
            title="Min dagbog"
            sub="Det, du har skrevet til dig selv, og breve til fremtiden"
            onClick={() => onOpen('dagbog')}
          />
          <LysLinkRow
            tokens={tokens}
            icon={<BookOpen size={18} />}
            title="Mine historier"
            sub="Det, du har delt med personalet"
            onClick={() => onOpen('mineHistorier')}
          />
          <LysLinkRow
            tokens={tokens}
            icon={<Flower2 size={18} />}
            title="Ressourceblomst"
            sub="Det, der giver dig styrke"
            onClick={() => onOpen('flower')}
          />
          <LysLinkRow
            tokens={tokens}
            icon={<CalendarCheck size={18} />}
            title="Ugens tilbageblik"
            sub="Fem korte spørgsmål om din uge"
            onClick={() => onOpen('weekly')}
          />
        </div>
      </LysCard>

      {/* ── Sådan har du haft det ───────────────────────────── */}
      <LysCard tokens={tokens} labelledBy="lys-vej-humoer">
        <LysLabel tokens={tokens} id="lys-vej-humoer">
          Sådan har du haft det
        </LysLabel>
        {hasMood ? (
          <>
            <div className="flex h-20 items-end gap-1">
              {moodHistory.map((day) => {
                const idx = day.value !== null ? moodIndex(day.value) : null;
                const on = selectedDay?.date === day.date;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDay(on ? null : day)}
                    className="flex h-full flex-1 items-end"
                    aria-label={`${day.dayName}: ${idx !== null ? LYS_QUICK_MOODS[idx]!.label : 'intet tjek-ind'}`}
                  >
                    <span
                      className="block w-full rounded-md transition-opacity"
                      style={{
                        height: idx !== null ? `${100 - idx * 18}%` : '6%',
                        backgroundColor: idx !== null ? moodColors[idx] : tokens.cardBorder,
                        opacity: selectedDay && !on ? 0.35 : 1,
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-sm" style={{ color: tokens.textMuted }}>
              {selectedDay
                ? `${selectedDay.dayName}: ${
                    selectedDay.value !== null
                      ? LYS_QUICK_MOODS[moodIndex(selectedDay.value)]!.label
                      : 'intet tjek-ind'
                  }`
                : 'De sidste 14 dage. Tryk på en dag for at se den.'}
            </p>
          </>
        ) : (
          <p className="text-[15px]" style={{ color: tokens.textMuted }}>
            Når du tjekker ind på Nu, kan du se dine dage her.
          </p>
        )}
      </LysCard>

      {/* ── Milepæle ────────────────────────────────────────── */}
      <LysCard tokens={tokens} labelledBy="lys-vej-milepaele">
        <LysLabel tokens={tokens} id="lys-vej-milepaele">
          Milepæle
        </LysLabel>
        {milestones.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {milestones.map(({ def, at }) => (
              <li key={def.key} className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{def.name}</span>
                  <span className="block text-sm" style={{ color: tokens.textMuted }}>
                    {def.desc}.{' '}
                    {new Date(at).toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px]" style={{ color: tokens.textMuted }}>
            Her samler Lys de skridt, du tager. De bliver her, også på de dårlige dage.
          </p>
        )}
      </LysCard>

      {/* ── Indstillinger ───────────────────────────────────── */}
      <LysCard tokens={tokens} labelledBy="lys-vej-indstillinger">
        <LysLabel tokens={tokens} id="lys-vej-indstillinger">
          Indstillinger
        </LysLabel>
        <LysLinkRow
          tokens={tokens}
          icon={appearance === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          title={appearance === 'light' ? 'Mørk skærm' : 'Lys skærm'}
          sub={appearance === 'light' ? 'Rarere om aftenen' : 'Skift tilbage til lys'}
          onClick={onToggleAppearance}
        />
        <LysLinkRow
          tokens={tokens}
          icon={<Volume2 size={18} />}
          title="Lys' stemme"
          sub="Vælg hvordan Lys lyder"
          onClick={() => router.push('/lys-settings')}
        />
      </LysCard>

      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={onLogout}
          className="min-h-[44px] px-4 text-sm font-medium underline underline-offset-4"
          style={{ color: tokens.textMuted }}
        >
          Log ud af Lys
        </button>
      </div>
    </div>
  );
}

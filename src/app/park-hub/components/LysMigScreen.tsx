'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useResident } from '../context/ResidentContext';
import { useResidentSession } from '@/hooks/useResidentSession';
import * as dataService from '@/lib/dataService';
import { moodBarsFromLocalCheckins } from '@/lib/lysCheckinHistory';
import { isResidentUuidForCloud } from '@/lib/residentUuid';
import {
  RESIDENT_BADGE_DEFS,
  normalizeBadgeKeyForDisplay,
  type ResidentBadgeDef,
} from '@/lib/residentBadges';
import { BookOpen, CalendarCheck, LifeBuoy, Target, Users, Wind } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';
import type { LysFlowOverlay } from '../lib/lysOverlay';
import { LysCard, LysLabel, LysLinkRow } from './lysUi';

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_INFO = [
  { level: 1, name: 'Frø', emoji: '🌱', min: 0, max: 99 },
  { level: 2, name: 'Spire', emoji: '🌿', min: 100, max: 249 },
  { level: 3, name: 'Plante', emoji: '🌾', min: 250, max: 499 },
  { level: 4, name: 'Blomst', emoji: '🌸', min: 500, max: 999 },
  { level: 5, name: 'Træ', emoji: '🌳', min: 1000, max: 9999 },
];

const THEMES = [
  { key: 'purple', color: '#7F77DD' },
  { key: 'amber', color: '#3B82F6' },
  { key: 'green', color: '#10B981' },
];

type MoodPoint = { date: string; label: string; value: number | null; dayName: string };
type XPData = { total_xp: number; level: number };
type BadgeRow = { badge_key: string; earned_at: string };

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  initials: string;
  reducedMotion: boolean;
  flowerFilledThisWeek?: boolean;
  onOpenBlomst: () => void;
  onOpen: (overlay: LysFlowOverlay) => void;
  onLogout: () => void;
};

function getLevelInfo(xp: number) {
  return LEVEL_INFO.find((l) => xp >= l.min && xp <= l.max) ?? LEVEL_INFO[0]!;
}

export default function LysMigScreen({
  tokens,
  accent,
  firstName,
  initials,
  reducedMotion: _reducedMotion,
  flowerFilledThisWeek = false,
  onOpenBlomst,
  onOpen,
  onLogout,
}: Props) {
  const { residentId } = useResident();
  const session = useResidentSession();
  const mode = session.storageMode;
  const activeId = session.activeId || residentId;
  /** Live UUID cookie → API. Demo/gæst → LysShell residentId (DemoSeeder), not guest UUID. */
  const checkinId =
    mode === 'supabase' && isResidentUuidForCloud(session.activeId)
      ? session.activeId
      : residentId || session.activeId;
  const checkinMode =
    mode === 'supabase' && isResidentUuidForCloud(checkinId) ? 'supabase' : 'local';

  const [xpData, setXpData] = useState<XPData>({ total_xp: 0, level: 1 });
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [moodHistory, setMoodHistory] = useState<MoodPoint[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [nickname, setNickname] = useState('');
  const [editingNick, setEditingNick] = useState(false);
  const [savingNick, setSavingNick] = useState(false);
  const [colorTheme, setColorTheme] = useState('purple');
  const [selectedMoodDay, setSelectedMoodDay] = useState<MoodPoint | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<ResidentBadgeDef | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load XP, badges, profile
  useEffect(() => {
    if (!activeId) return;
    void dataService.getXp(mode, activeId).then((d) => setXpData(d));
    void dataService.getBadges(mode, activeId).then((d) => setBadges(d as BadgeRow[]));
    void dataService.getProfile(mode, activeId).then((p) => {
      if (p.nickname) setNickname(p.nickname);
      if (p.theme) setColorTheme(p.theme);
    });
  }, [activeId, mode]);

  // Load 14-day mood history (live: cookie API; demo: localStorage)
  useEffect(() => {
    if (!checkinId) return;
    let cancelled = false;
    void dataService.getCheckins(checkinMode, checkinId).then((checkins) => {
      if (cancelled) return;
      setMoodHistory(moodBarsFromLocalCheckins(checkins, { days: 14 }));
    });
    return () => {
      cancelled = true;
    };
  }, [checkinId, checkinMode]);

  // Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !residentId || mode !== 'supabase') return;
    setUploadingAvatar(true);
    const supabase = createClient();
    if (!supabase) {
      setUploadingAvatar(false);
      return;
    }
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `avatars/${residentId}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });
    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = urlData.publicUrl;
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

  const handleThemeChange = async (key: string) => {
    setColorTheme(key);
    if (!activeId) return;
    await dataService.saveProfile(mode, activeId, { theme: key });
  };

  const profileAccent = useMemo(() => {
    const hit = THEMES.find((t) => t.key === colorTheme);
    return hit?.color ?? accent;
  }, [colorTheme, accent]);

  const levelInfo = getLevelInfo(xpData.total_xp);
  const nextLevel = LEVEL_INFO.find((l) => l.level === levelInfo.level + 1);
  const xpProgress = xpData.total_xp - levelInfo.min;
  const xpNeeded = (nextLevel?.min ?? levelInfo.max + 1) - levelInfo.min;
  const progressPct = nextLevel ? Math.min(100, (xpProgress / xpNeeded) * 100) : 100;
  const activeDays = moodHistory.filter((d) => d.value !== null).length;

  const isDarkish = tokens.colorScheme === 'dark';
  const cardBg = tokens.cardBg;
  const subtext = tokens.textMuted;

  const earnedNormalizedKeys = new Set(badges.map((r) => normalizeBadgeKeyForDisplay(r.badge_key)));
  const earnedBadges = RESIDENT_BADGE_DEFS.filter((b) => earnedNormalizedKeys.has(b.key));
  const lockedBadges = RESIDENT_BADGE_DEFS.filter((b) => !earnedNormalizedKeys.has(b.key));

  // Energy level → visual height percentage (1-10 or 1-5 scale)
  function energyToPct(val: number | null): number {
    if (val === null) return 0;
    // Demo data uses 1-10, some might use 1-5
    const max = val > 5 ? 10 : 5;
    return Math.max(10, (val / max) * 100);
  }

  function energyToColor(val: number | null): string {
    if (val === null) return `${profileAccent}20`;
    const pct = val > 5 ? val / 10 : val / 5;
    if (pct >= 0.75) return '#22C55E';
    if (pct >= 0.5) return profileAccent;
    if (pct >= 0.3) return '#F59E0B';
    return '#EF4444';
  }

  function energyToLabel(val: number | null): string {
    if (val === null) return '—';
    const pct = val > 5 ? val / 10 : val / 5;
    if (pct >= 0.8) return 'Fantastisk';
    if (pct >= 0.6) return 'Godt';
    if (pct >= 0.4) return 'OK';
    if (pct >= 0.2) return 'Svært';
    return 'Meget svært';
  }

  return (
    <div className="space-y-4 px-5 pb-8 pt-4 font-sans" style={{ color: tokens.text }}>
      {/* ── Profile hero ─────────────────────────────────────────── */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: `linear-gradient(150deg, ${profileAccent}18 0%, ${profileAccent}06 100%)`,
          border: `1px solid ${profileAccent}20`,
        }}
      >
        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <div
              className="h-20 w-20 shrink-0 rounded-full flex items-center justify-center text-2xl font-black text-white overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${profileAccent}, ${profileAccent}99)`,
                boxShadow: `0 6px 24px ${profileAccent}40`,
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            {mode === 'supabase' ? (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center text-white text-xs transition-all active:scale-90"
                  style={{ backgroundColor: profileAccent }}
                  aria-label="Skift profilbillede"
                >
                  {uploadingAvatar ? '…' : '📷'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleAvatarUpload(e)}
                />
              </>
            ) : (
              <div
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center text-white text-[9px]"
                style={{ backgroundColor: `${profileAccent}88` }}
              >
                🔒
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editingNick ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="flex-1 rounded-lg px-2 py-1 text-lg font-black outline-none min-w-0"
                  style={{
                    backgroundColor: `${profileAccent}18`,
                    border: `1px solid ${profileAccent}33`,
                    color: tokens.text,
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => void saveNickname()}
                  disabled={savingNick}
                  className="text-xs font-bold px-2 py-1 rounded-lg text-white"
                  style={{ backgroundColor: profileAccent }}
                >
                  Gem
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditingNick(true)} className="text-left">
                <h1 className="text-2xl font-black leading-tight">{nickname || firstName}</h1>
                <p className="text-xs mt-0.5" style={{ color: subtext }}>
                  Tryk for at redigere
                </p>
              </button>
            )}
            <p className="text-sm font-bold mt-1" style={{ color: profileAccent }}>
              {levelInfo.emoji} Niveau {levelInfo.level} — {levelInfo.name}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-0 mb-4">
          <div className="flex-1 text-center">
            <p className="text-2xl font-black" style={{ color: profileAccent }}>
              {xpData.total_xp}
            </p>
            <p className="text-xs mt-0.5" style={{ color: subtext }}>
              XP i alt
            </p>
          </div>
          <div
            className="w-px h-10 self-center"
            style={{ backgroundColor: `${profileAccent}25` }}
          />
          <div className="flex-1 text-center">
            <p className="text-2xl font-black">📅 {activeDays}</p>
            <p className="text-xs mt-0.5" style={{ color: subtext }}>
              aktive dage
            </p>
          </div>
        </div>

        {/* XP progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold" style={{ color: subtext }}>
              {nextLevel
                ? `${xpProgress} / ${xpNeeded} XP til ${nextLevel.emoji} Niveau ${nextLevel.level}`
                : 'Maks niveau nået!'}
            </p>
            <p className="text-xs font-bold" style={{ color: profileAccent }}>
              {Math.round(progressPct)}%
            </p>
          </div>
          <div
            className="h-2 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: `${profileAccent}20` }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, backgroundColor: profileAccent }}
            />
          </div>
        </div>

        {/* Color theme — inline compact */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold" style={{ color: subtext }}>
            Farvetema
          </p>
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => void handleThemeChange(t.key)}
                className="h-7 w-7 rounded-full transition-all duration-200 active:scale-90"
                style={{
                  backgroundColor: t.color,
                  boxShadow:
                    colorTheme === t.key ? `0 0 0 3px ${tokens.bg}, 0 0 0 5px ${t.color}` : 'none',
                  transform: colorTheme === t.key ? 'scale(1.15)' : 'scale(1)',
                }}
                aria-label={`Farvetema ${t.key}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Mine ting ─────────────────────────────────────────── */}
      <LysCard tokens={tokens} labelledBy="lys-mig-ting">
        <LysLabel tokens={tokens} id="lys-mig-ting">
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
            icon={<LifeBuoy size={18} />}
            title="Min kriseplan"
            sub="Hvad hjælper, når det er svært"
            onClick={() => onOpen('crisis')}
          />
          <LysLinkRow
            tokens={tokens}
            icon={<Wind size={18} />}
            title="Ro og sanser"
            sub="Øvelser, der giver ro"
            onClick={() => onOpen('sanser')}
          />
          <LysLinkRow
            tokens={tokens}
            icon={<Users size={18} />}
            title="Hvem er på arbejde"
            sub="Vagtplanen for i dag og i morgen"
            onClick={() => onOpen('vagtplan')}
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
            icon={<CalendarCheck size={18} />}
            title="Ugens tilbageblik"
            sub="Se tilbage på din uge"
            onClick={() => onOpen('weekly')}
          />
        </div>
      </LysCard>

      {/* ── 14-day stemning — interactive bars ─────────────────── */}
      <section
        className="rounded-3xl p-5"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : tokens.shadow }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold">Stemning — 14 dage</h2>
          {activeDays > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${profileAccent}18`, color: profileAccent }}
            >
              {activeDays} af 14 dage
            </span>
          )}
        </div>

        {moodHistory.some((d) => d.value !== null) ? (
          <>
            {/* Interactive bar chart */}
            <div className="flex items-end gap-1 h-20 mb-3">
              {moodHistory.map((day, i) => {
                const pct = energyToPct(day.value);
                const color = energyToColor(day.value);
                const isSelected = selectedMoodDay?.date === day.date;
                const isToday = i === moodHistory.length - 1;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedMoodDay(isSelected ? null : day)}
                    className="flex-1 flex flex-col items-center justify-end gap-0.5 h-full transition-all duration-150 active:scale-95 rounded-sm"
                    aria-label={`${day.label}: ${energyToLabel(day.value)}`}
                  >
                    <div
                      className="w-full rounded-t-sm transition-all duration-300"
                      style={{
                        height: day.value !== null ? `${pct}%` : '6%',
                        backgroundColor: day.value !== null ? color : `${profileAccent}18`,
                        opacity: selectedMoodDay && !isSelected ? 0.4 : 1,
                        boxShadow: isSelected
                          ? `0 0 0 2px ${tokens.bg}, 0 0 0 3px ${color}`
                          : 'none',
                        minHeight: '4px',
                      }}
                    />
                    {isToday && (
                      <div
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: profileAccent }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Day detail — shows on tap */}
            {selectedMoodDay ? (
              <div
                className="rounded-2xl px-4 py-3 flex items-center gap-3 transition-all"
                style={{
                  backgroundColor: `${energyToColor(selectedMoodDay.value)}15`,
                  border: `1px solid ${energyToColor(selectedMoodDay.value)}30`,
                }}
              >
                <span className="text-2xl">
                  {selectedMoodDay.value !== null
                    ? (['😔', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩', '💫', '🌟'][
                        selectedMoodDay.value - 1
                      ] ?? '😐')
                    : '—'}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold capitalize" style={{ color: tokens.text }}>
                    {selectedMoodDay.dayName}
                  </p>
                  <p className="text-xs" style={{ color: subtext }}>
                    {selectedMoodDay.value !== null
                      ? energyToLabel(selectedMoodDay.value)
                      : 'Ingen registrering'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMoodDay(null)}
                  className="text-xs"
                  style={{ color: subtext }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex justify-between px-1">
                <p className="text-[9px]" style={{ color: subtext }}>
                  {moodHistory[0]?.label}
                </p>
                <p className="text-[9px]" style={{ color: subtext }}>
                  I dag
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-center py-6" style={{ color: subtext }}>
            Ingen humørdata endnu — tjek ind dagligt for at se din kurve
          </p>
        )}
      </section>

      {/* ── Badges — Stepsapp style ──────────────────────────────── */}
      <section
        className="rounded-3xl p-5"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : tokens.shadow }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold">Badges</h2>
          <span className="text-xs font-semibold" style={{ color: profileAccent }}>
            {earnedBadges.length}/{RESIDENT_BADGE_DEFS.length}
          </span>
        </div>

        {/* Earned badges */}
        {earnedBadges.length > 0 && (
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {earnedBadges.map((b) => {
              const earnedRow = badges
                .filter((r) => normalizeBadgeKeyForDisplay(r.badge_key) === b.key)
                .sort(
                  (a, c) => new Date(a.earned_at).getTime() - new Date(c.earned_at).getTime()
                )[0];
              const earnedDate = earnedRow
                ? new Date(earnedRow.earned_at).toLocaleDateString('da-DK', {
                    day: 'numeric',
                    month: 'short',
                  })
                : '';
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setSelectedBadge(selectedBadge?.key === b.key ? null : b)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl py-4 px-2 transition-all duration-200 active:scale-95"
                  style={{
                    background:
                      selectedBadge?.key === b.key
                        ? `linear-gradient(150deg, ${profileAccent}28, ${profileAccent}10)`
                        : `linear-gradient(150deg, ${profileAccent}18, ${profileAccent}06)`,
                    border: `1.5px solid ${selectedBadge?.key === b.key ? profileAccent : `${profileAccent}30`}`,
                    boxShadow:
                      selectedBadge?.key === b.key ? `0 4px 16px ${profileAccent}30` : 'none',
                  }}
                >
                  <span className="text-2xl leading-none">{b.emoji}</span>
                  <p
                    className="text-[10px] font-bold text-center leading-tight"
                    style={{ color: profileAccent }}
                  >
                    {b.name}
                  </p>
                  <p className="text-[9px] text-center opacity-60" style={{ color: tokens.text }}>
                    {earnedDate}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected badge detail */}
        {selectedBadge && earnedBadges.includes(selectedBadge) && (
          <div
            className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
            style={{
              backgroundColor: `${profileAccent}10`,
              border: `1px solid ${profileAccent}25`,
            }}
          >
            <span className="text-3xl">{selectedBadge.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: tokens.text }}>
                {selectedBadge.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: subtext }}>
                {selectedBadge.desc}
              </p>
            </div>
          </div>
        )}

        {/* Locked badges */}
        {lockedBadges.length > 0 && (
          <>
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-2"
              style={{ color: subtext }}
            >
              Kommende
            </p>
            <div className="grid grid-cols-4 gap-2">
              {lockedBadges.slice(0, 8).map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setSelectedBadge(selectedBadge?.key === b.key ? null : b)}
                  className="flex flex-col items-center gap-1 rounded-xl py-3 px-1 transition-all active:scale-95"
                  style={{
                    backgroundColor: isDarkish ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    border: '1.5px solid transparent',
                  }}
                >
                  <span
                    className="text-xl leading-none"
                    style={{ filter: 'grayscale(1)', opacity: 0.4 }}
                  >
                    {b.emoji}
                  </span>
                  <p
                    className="text-[9px] text-center font-medium leading-tight"
                    style={{ color: subtext, opacity: 0.6 }}
                  >
                    {b.name}
                  </p>
                </button>
              ))}
            </div>
            {selectedBadge && lockedBadges.includes(selectedBadge) && (
              <div
                className="rounded-2xl px-4 py-2.5 mt-2 flex items-center gap-2"
                style={{
                  backgroundColor: isDarkish ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }}
              >
                <span className="text-xl">{selectedBadge.emoji}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: subtext }}>
                    {selectedBadge.name}
                  </p>
                  <p className="text-[10px]" style={{ color: subtext, opacity: 0.7 }}>
                    Lås op: {selectedBadge.hint}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Ressourceblomst ──────────────────────────────────────── */}
      <section
        className="rounded-3xl overflow-hidden"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : tokens.shadow }}
      >
        <div className="flex items-stretch">
          {/* Visual */}
          <div
            className="w-24 shrink-0 flex items-center justify-center text-4xl"
            style={{
              background: `linear-gradient(160deg, ${profileAccent}15, ${profileAccent}05)`,
            }}
          >
            🌸
          </div>
          {/* Content */}
          <div className="flex-1 px-4 py-4 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold">Ressourceblomst</h2>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: subtext }}>
                {flowerFilledThisWeek
                  ? 'Opdateret denne uge — flot!'
                  : 'Kortlæg dine ressourcer og se dem blomstre'}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenBlomst}
              className="mt-3 rounded-xl py-2 px-4 text-xs font-bold text-white self-start transition-all duration-200 active:scale-[0.97]"
              style={{
                background: `linear-gradient(135deg, ${profileAccent}, ${profileAccent}cc)`,
                boxShadow: !flowerFilledThisWeek ? `0 4px 12px ${profileAccent}40` : undefined,
              }}
            >
              {flowerFilledThisWeek ? 'Opdater blomst' : 'Åbn blomst →'}
            </button>
          </div>
        </div>
      </section>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onLogout}
          className="min-h-[44px] px-4 text-sm font-medium underline underline-offset-4"
          style={{ color: subtext }}
        >
          Log ud af Lys
        </button>
      </div>
    </div>
  );
}

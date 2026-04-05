'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useResident } from '../context/ResidentContext';
import { useResidentSession } from '@/hooks/useResidentSession';
import * as dataService from '@/lib/dataService';
import type { LysThemeTokens } from '../lib/lysTheme';

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_INFO = [
  { level: 1, name: 'Frø', emoji: '🌱', min: 0, max: 99 },
  { level: 2, name: 'Spire', emoji: '🌿', min: 100, max: 249 },
  { level: 3, name: 'Plante', emoji: '🌾', min: 250, max: 499 },
  { level: 4, name: 'Blomst', emoji: '🌸', min: 500, max: 999 },
  { level: 5, name: 'Træ', emoji: '🌳', min: 1000, max: 9999 },
];

// Match keys used in DemoSeeder
const BADGE_DEFS: { key: string; name: string; desc: string; emoji: string; hint: string }[] = [
  {
    key: 'first_checkin',
    name: 'Første tjek-ind',
    desc: 'Registrerede stemning for første gang',
    emoji: '🌅',
    hint: 'Tjek ind én gang',
  },
  {
    key: 'week_streak',
    name: 'Ugens helt',
    desc: '7 dage i træk med daglig tjek-ind',
    emoji: '🔥',
    hint: '7 dages streak',
  },
  {
    key: 'journal_debut',
    name: 'Forfatter',
    desc: 'Skrev den første journalindgang',
    emoji: '📝',
    hint: 'Skriv én journal',
  },
  {
    key: 'garden_first',
    name: 'Grøn tommelfinger',
    desc: 'Plantede det første mål i haven',
    emoji: '🌱',
    hint: 'Opret ét mål i haven',
  },
  {
    key: 'krap_master',
    name: 'Tankemester',
    desc: 'Udfordrede en negativ tanke med KRAP',
    emoji: '🧠',
    hint: 'Brug tankefanger',
  },
  {
    key: 'calm_week',
    name: 'Ro i sindet',
    desc: 'Gennemsnitlig energi over 6 i en hel uge',
    emoji: '🌊',
    hint: 'Høj energi hele ugen',
  },
  {
    key: 'consistent_7',
    name: 'Konsistent',
    desc: '7 dage i træk med humørtjek',
    emoji: '⚡',
    hint: '7 dages streak',
  },
  {
    key: 'first_chat',
    name: 'Åben',
    desc: 'Første samtale med Lys',
    emoji: '💬',
    hint: 'Tal med Lys',
  },
  {
    key: 'planner_5',
    name: 'Planlægger',
    desc: '5 egne planpunkter oprettet',
    emoji: '📅',
    hint: 'Tilføj 5 aktiviteter',
  },
  {
    key: 'brave',
    name: 'Modig',
    desc: 'Delt noget svært i journalen',
    emoji: '💙',
    hint: 'Del noget svært',
  },
];

const THEMES = [
  { key: 'purple', color: '#7F77DD' },
  { key: 'amber', color: '#3B82F6' },
  { key: 'green', color: '#10B981' },
];

const TREND_ENCOURAGEMENT: Record<string, string> = {
  Energi:
    'Dit energiniveau har holdt sig stabilt de seneste dage. Fortsæt med at prioritere søvn og bevægelse 💪',
  Stemning: 'Din stemning viser en positiv retning. Det du gør, virker — bliv ved 🌟',
  Søvn: 'Bedre søvn er en af de stærkeste ressourcer du har. Hvert ekstra kvarter tæller 🌙',
  Social: 'Social kontakt er sundt. Selv en kort samtale med en kollega eller ven hjælper 💬',
  Stress: 'Du håndterer stress bedre end du tror. Husk at tage pauser i løbet af dagen 🌿',
};

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
}: Props) {
  const { residentId } = useResident();
  const session = useResidentSession();
  const mode = session.storageMode;
  const activeId = session.activeId || residentId;

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
  const [selectedBadge, setSelectedBadge] = useState<(typeof BADGE_DEFS)[0] | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<string | null>(null);
  const [staffMsg, setStaffMsg] = useState('');
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);

  const sendToStaff = async () => {
    if (!staffMsg.trim() || sendState === 'sending') return;
    setSendState('sending');
    try {
      const res = await fetch('/api/park/message-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: staffMsg }),
      });
      if (res.ok) {
        setSendState('sent');
        setStaffMsg('');
        setTimeout(() => setSendState('idle'), 4000);
      } else {
        setSendState('error');
      }
    } catch {
      setSendState('error');
    }
  };

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

  // Load 14-day mood history
  useEffect(() => {
    if (!activeId) return;
    const today = new Date();
    const buildHistory = (checkins: Array<{ check_in_date: string; energy_level: number }>) => {
      const map = new Map<string, number>();
      for (const row of checkins) map.set(row.check_in_date, row.energy_level);
      const result: MoodPoint[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const val = map.get(key) ?? null;
        result.push({
          date: key,
          label: d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }),
          dayName: d.toLocaleDateString('da-DK', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }),
          value: val,
        });
      }
      setMoodHistory(result);
    };

    if (mode === 'supabase') {
      const supabase = createClient();
      if (!supabase) return;
      const from = new Date(today);
      from.setDate(today.getDate() - 13);
      supabase
        .from('park_daily_checkin')
        .select('check_in_date, energy_level')
        .eq('resident_id', activeId)
        .gte('check_in_date', from.toISOString().slice(0, 10))
        .order('check_in_date')
        .then(({ data }) =>
          buildHistory((data ?? []) as Array<{ check_in_date: string; energy_level: number }>)
        );
    } else {
      void dataService
        .getCheckins(mode, activeId)
        .then((checkins) =>
          buildHistory(
            checkins.map((c) => ({ check_in_date: c.check_in_date, energy_level: c.energy_level }))
          )
        );
    }
  }, [activeId, mode]);

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
      await fetch('/api/park/resident-me', {
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

  const levelInfo = getLevelInfo(xpData.total_xp);
  const nextLevel = LEVEL_INFO.find((l) => l.level === levelInfo.level + 1);
  const xpProgress = xpData.total_xp - levelInfo.min;
  const xpNeeded = (nextLevel?.min ?? levelInfo.max + 1) - levelInfo.min;
  const progressPct = nextLevel ? Math.min(100, (xpProgress / xpNeeded) * 100) : 100;
  const activeDays = moodHistory.filter((d) => d.value !== null).length;

  const isDarkish = tokens.bg.startsWith('#0');
  const cardBg = isDarkish ? 'rgba(255,255,255,0.07)' : tokens.cardBg;
  const subtext = isDarkish ? 'rgba(255,255,255,0.45)' : tokens.textMuted;

  const earnedBadges = BADGE_DEFS.filter((b) => badges.some((r) => r.badge_key === b.key));
  const lockedBadges = BADGE_DEFS.filter((b) => !badges.some((r) => r.badge_key === b.key));

  // Energy level → visual height percentage (1-10 or 1-5 scale)
  function energyToPct(val: number | null): number {
    if (val === null) return 0;
    // Demo data uses 1-10, some might use 1-5
    const max = val > 5 ? 10 : 5;
    return Math.max(10, (val / max) * 100);
  }

  function energyToColor(val: number | null): string {
    if (val === null) return `${accent}20`;
    const pct = val > 5 ? val / 10 : val / 5;
    if (pct >= 0.75) return '#22C55E';
    if (pct >= 0.5) return accent;
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

  const trendRows = [
    { label: 'Energi', val: 3.8, delta: +0.3 },
    { label: 'Stemning', val: 3.5, delta: -0.2 },
    { label: 'Søvn', val: 3.2, delta: +0.5 },
    { label: 'Social', val: 2.9, delta: 0 },
    { label: 'Stress', val: 2.5, delta: -0.4 },
  ];

  return (
    <div className="space-y-4 px-5 pb-8 pt-4 font-sans" style={{ color: tokens.text }}>
      {/* ── Profile hero ─────────────────────────────────────────── */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: `linear-gradient(150deg, ${accent}18 0%, ${accent}06 100%)`,
          border: `1px solid ${accent}20`,
        }}
      >
        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <div
              className="h-20 w-20 shrink-0 rounded-full flex items-center justify-center text-2xl font-black text-white overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
                boxShadow: `0 6px 24px ${accent}40`,
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
                  style={{ backgroundColor: accent }}
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
                style={{ backgroundColor: `${accent}88` }}
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
                    backgroundColor: `${accent}18`,
                    border: `1px solid ${accent}33`,
                    color: tokens.text,
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => void saveNickname()}
                  disabled={savingNick}
                  className="text-xs font-bold px-2 py-1 rounded-lg text-white"
                  style={{ backgroundColor: accent }}
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
            <p className="text-sm font-bold mt-1" style={{ color: accent }}>
              {levelInfo.emoji} Niveau {levelInfo.level} — {levelInfo.name}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-0 mb-4">
          <div className="flex-1 text-center">
            <p className="text-2xl font-black">🔥 5</p>
            <p className="text-xs mt-0.5" style={{ color: subtext }}>
              dages streak
            </p>
          </div>
          <div className="w-px h-10 self-center" style={{ backgroundColor: `${accent}25` }} />
          <div className="flex-1 text-center">
            <p className="text-2xl font-black" style={{ color: accent }}>
              {xpData.total_xp}
            </p>
            <p className="text-xs mt-0.5" style={{ color: subtext }}>
              XP i alt
            </p>
          </div>
          <div className="w-px h-10 self-center" style={{ backgroundColor: `${accent}25` }} />
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
            <p className="text-xs font-bold" style={{ color: accent }}>
              {Math.round(progressPct)}%
            </p>
          </div>
          <div
            className="h-2 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: `${accent}20` }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, backgroundColor: accent }}
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
              style={{ backgroundColor: `${accent}18`, color: accent }}
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
                        backgroundColor: day.value !== null ? color : `${accent}18`,
                        opacity: selectedMoodDay && !isSelected ? 0.4 : 1,
                        boxShadow: isSelected
                          ? `0 0 0 2px ${tokens.bg}, 0 0 0 3px ${color}`
                          : 'none',
                        minHeight: '4px',
                      }}
                    />
                    {isToday && (
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: accent }} />
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
          <span className="text-xs font-semibold" style={{ color: accent }}>
            {earnedBadges.length}/{BADGE_DEFS.length}
          </span>
        </div>

        {/* Earned badges */}
        {earnedBadges.length > 0 && (
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {earnedBadges.map((b) => {
              const earnedRow = badges.find((r) => r.badge_key === b.key);
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
                        ? `linear-gradient(150deg, ${accent}28, ${accent}10)`
                        : `linear-gradient(150deg, ${accent}18, ${accent}06)`,
                    border: `1.5px solid ${selectedBadge?.key === b.key ? accent : `${accent}30`}`,
                    boxShadow: selectedBadge?.key === b.key ? `0 4px 16px ${accent}30` : 'none',
                  }}
                >
                  <span className="text-2xl leading-none">{b.emoji}</span>
                  <p
                    className="text-[10px] font-bold text-center leading-tight"
                    style={{ color: accent }}
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
            style={{ backgroundColor: `${accent}10`, border: `1px solid ${accent}25` }}
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
              {lockedBadges.slice(0, 4).map((b) => (
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

      {/* ── Ressourcetendenser — interactive rows ────────────────── */}
      <section
        className="rounded-3xl overflow-hidden"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : tokens.shadow }}
      >
        <div className="px-5 pt-4 pb-2">
          <h2 className="text-sm font-bold">Ressourcetendenser</h2>
          <p className="text-xs mt-0.5" style={{ color: subtext }}>
            Tryk på en kategori for at lære mere
          </p>
        </div>
        <div className="px-5 pb-4 space-y-2.5">
          {trendRows.map((r) => {
            const isOpen = selectedTrend === r.label;
            return (
              <div key={r.label}>
                <button
                  type="button"
                  onClick={() => setSelectedTrend(isOpen ? null : r.label)}
                  className="w-full flex items-center gap-3 py-1 transition-all active:opacity-70"
                >
                  <p className="text-sm font-medium w-20 shrink-0 text-left">{r.label}</p>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: `${accent}14` }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(r.val / 5) * 100}%`,
                        backgroundColor: isOpen ? accent : `${accent}88`,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-bold w-8 text-right"
                    style={{ color: r.delta > 0 ? '#22C55E' : r.delta < 0 ? '#EF4444' : subtext }}
                  >
                    {r.delta > 0 ? `+${r.delta}` : r.delta === 0 ? '→' : r.delta}
                  </span>
                </button>
                {isOpen && (
                  <div
                    className="rounded-2xl px-3.5 py-2.5 mt-1.5 text-xs leading-relaxed"
                    style={{
                      backgroundColor: `${accent}10`,
                      border: `1px solid ${accent}20`,
                      color: tokens.text,
                    }}
                  >
                    {TREND_ENCOURAGEMENT[r.label] ?? 'Hold godt fast i det, der virker.'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
            style={{ background: `linear-gradient(160deg, ${accent}15, ${accent}05)` }}
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
                background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                boxShadow: !flowerFilledThisWeek ? `0 4px 12px ${accent}40` : undefined,
              }}
            >
              {flowerFilledThisWeek ? 'Opdater blomst' : 'Åbn blomst →'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Skriv til personalet ──────────────────────────────────── */}
      <section
        className="rounded-3xl p-5"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : tokens.shadow }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl">💬</span>
          <div>
            <h2 className="text-sm font-bold" style={{ color: tokens.text }}>
              Skriv til personalet
            </h2>
            <p className="text-xs mt-0.5" style={{ color: subtext }}>
              Send en besked direkte til bostedet
            </p>
          </div>
        </div>

        {sendState === 'sent' ? (
          <div
            className="rounded-2xl px-4 py-4 text-center"
            style={{ backgroundColor: `${accent}14`, border: `1px solid ${accent}30` }}
          >
            <p className="text-sm font-bold" style={{ color: accent }}>
              Sendt ✓
            </p>
            <p className="text-xs mt-1" style={{ color: subtext }}>
              Personalet har modtaget din besked
            </p>
          </div>
        ) : (
          <>
            <textarea
              value={staffMsg}
              onChange={(e) => setStaffMsg(e.target.value)}
              placeholder="Skriv din besked her…"
              rows={3}
              className="w-full rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none transition-colors mb-3"
              style={{
                backgroundColor: `${accent}10`,
                border: `1px solid ${accent}25`,
                color: tokens.text,
              }}
            />
            {sendState === 'error' && (
              <p className="text-xs text-red-400 mb-2">Noget gik galt — prøv igen</p>
            )}
            <button
              type="button"
              disabled={!staffMsg.trim() || sendState === 'sending'}
              onClick={() => void sendToStaff()}
              className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                boxShadow: staffMsg.trim() ? `0 4px 16px ${accent}35` : undefined,
              }}
            >
              {sendState === 'sending' ? 'Sender…' : 'Send besked'}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useResident } from '../context/ResidentContext';
import { useResidentSession } from '@/hooks/useResidentSession';
import * as dataService from '@/lib/dataService';
import { getItem, setItem } from '@/lib/localStore';
import { LOCAL_KEYS } from '@/types/local';
import type { LysThemeTokens } from '../lib/lysTheme';

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_INFO = [
  { level: 1, name: 'Frø',     emoji: '🌱', min: 0,    max: 99 },
  { level: 2, name: 'Spire',   emoji: '🌿', min: 100,  max: 249 },
  { level: 3, name: 'Plante',  emoji: '🌾', min: 250,  max: 499 },
  { level: 4, name: 'Blomst',  emoji: '🌸', min: 500,  max: 999 },
  { level: 5, name: 'Træ',     emoji: '🌳', min: 1000, max: 9999 },
];

const BADGE_DEFS: { key: string; name: string; desc: string; emoji: string }[] = [
  { key: 'first_journal',  name: 'Første skridt',  desc: 'Første journal gemt',           emoji: '📝' },
  { key: 'consistent_7',  name: 'Konsistent',      desc: '7 dage i træk med humørtjek',   emoji: '🔥' },
  { key: 'first_chat',    name: 'Åben',            desc: 'Første samtale med Lys',         emoji: '💬' },
  { key: 'planner_5',     name: 'Planlægger',      desc: '5 egne planpunkter oprettet',    emoji: '📅' },
  { key: 'brave',         name: 'Modig',           desc: 'Delt noget svært i journal',     emoji: '💙' },
];

const THEMES = [
  { key: 'purple', label: 'Lys lilla', color: '#7F77DD' },
  { key: 'amber',  label: 'Blå',      color: '#3B82F6' },
  { key: 'green',  label: 'Grøn',     color: '#10B981' },
];

type MoodPoint = { date: string; label: string; value: number | null };
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
  onOpenCrisis: () => void;
  onOpenKrisePlan: () => void;
};

function getLevelInfo(xp: number) {
  return LEVEL_INFO.find(l => xp >= l.min && xp <= l.max) ?? LEVEL_INFO[0]!;
}

export default function LysMigScreen({
  tokens,
  accent,
  firstName,
  initials,
  reducedMotion,
  flowerFilledThisWeek = false,
  onOpenBlomst,
  onOpenCrisis,
  onOpenKrisePlan,
}: Props) {
  const { residentId } = useResident();
  const session = useResidentSession();
  const mode    = session.storageMode;
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
  const [trendOpen, setTrendOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load XP, badges, profile via dataService
  useEffect(() => {
    if (!activeId) return;
    void dataService.getXp(mode, activeId).then(d => setXpData(d));
    void dataService.getBadges(mode, activeId).then(d => setBadges(d as BadgeRow[]));
    void dataService.getProfile(mode, activeId).then(p => {
      if (p.nickname) setNickname(p.nickname);
      if (p.theme)    setColorTheme(p.theme);
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
        result.push({
          date:  key,
          label: d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }),
          value: map.get(key) ?? null,
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
        .then(({ data }) => buildHistory((data ?? []) as Array<{ check_in_date: string; energy_level: number }>));
    } else {
      // Build from local checkins
      void dataService.getCheckins(mode, activeId).then(checkins =>
        buildHistory(checkins.map(c => ({ check_in_date: c.check_in_date, energy_level: c.energy_level }))),
      );
    }
  }, [activeId, mode]);

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !residentId || mode !== 'supabase') return;
    setUploadingAvatar(true);
    const supabase = createClient();
    if (!supabase) { setUploadingAvatar(false); return; }
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `avatars/${residentId}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = urlData.publicUrl;
      setAvatarUrl(url);
      await supabase.from('care_residents').update({ avatar_url: url }).eq('user_id', residentId);
    }
    setUploadingAvatar(false);
  };

  // ── Nickname save ─────────────────────────────────────────────────────────
  const saveNickname = async () => {
    if (!activeId) return;
    setSavingNick(true);
    await dataService.saveProfile(mode, activeId, { nickname });
    setSavingNick(false);
    setEditingNick(false);
  };

  // ── Theme change ──────────────────────────────────────────────────────────
  const handleThemeChange = async (key: string) => {
    setColorTheme(key);
    if (!activeId) return;
    await dataService.saveProfile(mode, activeId, { theme: key });
  };

  const levelInfo = getLevelInfo(xpData.total_xp);
  const nextLevel = LEVEL_INFO.find(l => l.level === levelInfo.level + 1);
  const xpProgress = xpData.total_xp - levelInfo.min;
  const xpNeeded = (nextLevel?.min ?? levelInfo.max + 1) - levelInfo.min;
  const progressPct = nextLevel ? Math.min(100, (xpProgress / xpNeeded) * 100) : 100;

  const isDarkish = tokens.bg.startsWith('#0');
  const cardBg = isDarkish ? 'rgba(255,255,255,0.07)' : tokens.cardBg;
  const subtext = isDarkish ? 'rgba(255,255,255,0.45)' : tokens.textMuted;
  const activeDays = moodHistory.filter(d => d.value !== null).length;

  return (
    <div className="space-y-4 px-5 pb-8 pt-4 font-sans" style={{ color: tokens.text }}>

      {/* Profile hero */}
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
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)`, boxShadow: `0 6px 24px ${accent}40` }}
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
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => void handleAvatarUpload(e)} />
              </>
            ) : (
              <div
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center text-white text-[9px]"
                style={{ backgroundColor: `${accent}88` }}
                title="Log ind for at tilføje billede"
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
                  onChange={e => setNickname(e.target.value)}
                  className="flex-1 rounded-lg px-2 py-1 text-lg font-black outline-none min-w-0"
                  style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}33`, color: tokens.text }}
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
                <p className="text-xs mt-0.5" style={{ color: subtext }}>Tryk for at redigere</p>
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
            <p className="text-xs mt-0.5" style={{ color: subtext }}>dages streak</p>
          </div>
          <div className="w-px h-10 self-center" style={{ backgroundColor: `${accent}25` }} />
          <div className="flex-1 text-center">
            <p className="text-2xl font-black" style={{ color: accent }}>{xpData.total_xp}</p>
            <p className="text-xs mt-0.5" style={{ color: subtext }}>XP i alt</p>
          </div>
          <div className="w-px h-10 self-center" style={{ backgroundColor: `${accent}25` }} />
          <div className="flex-1 text-center">
            <p className="text-2xl font-black">📅 {activeDays}</p>
            <p className="text-xs mt-0.5" style={{ color: subtext }}>aktive dage</p>
          </div>
        </div>

        {/* XP progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold" style={{ color: subtext }}>
              {nextLevel ? `${xpProgress} / ${xpNeeded} XP til ${nextLevel.emoji} Niveau ${nextLevel.level}` : 'Maks niveau nået!'}
            </p>
            <p className="text-xs font-bold" style={{ color: accent }}>{Math.round(progressPct)}%</p>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: `${accent}20` }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, backgroundColor: accent }}
            />
          </div>
        </div>
      </section>

      {/* Theme picker */}
      <section
        className="rounded-3xl p-5"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : tokens.shadow }}
      >
        <h2 className="text-sm font-bold mb-3">Farvetema</h2>
        <div className="flex gap-3">
          {THEMES.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => void handleThemeChange(t.key)}
              className="flex flex-1 flex-col items-center gap-2 rounded-xl py-3 transition-all active:scale-95"
              style={{
                border: `2px solid ${colorTheme === t.key ? t.color : 'transparent'}`,
                backgroundColor: `${t.color}18`,
              }}
            >
              <div className="h-6 w-6 rounded-full" style={{ backgroundColor: t.color }} />
              <p className="text-xs font-semibold" style={{ color: colorTheme === t.key ? t.color : subtext }}>
                {t.label}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* 14-day mood line chart */}
      <section
        className="rounded-3xl p-5"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : tokens.shadow }}
      >
        <h2 className="text-sm font-bold mb-4">Stemning — 14 dage</h2>
        {moodHistory.some(d => d.value !== null) ? (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={moodHistory} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${accent}14`} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: subtext }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fontSize: 9, fill: subtext }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tokens.bg,
                  border: `1px solid ${accent}22`,
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: number) => [v, 'Niveau']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={accent}
                strokeWidth={2.5}
                dot={{ r: 3, fill: accent, strokeWidth: 0 }}
                connectNulls={false}
                animationDuration={reducedMotion ? 0 : 800}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-center py-6" style={{ color: subtext }}>
            Ingen humørdata endnu — tjek ind dagligt for at se din kurve
          </p>
        )}
      </section>

      {/* Badges */}
      <section
        className="rounded-3xl p-5"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : tokens.shadow }}
      >
        <h2 className="text-sm font-bold mb-4">Badges</h2>
        <div className="grid grid-cols-3 gap-3">
          {BADGE_DEFS.map(b => {
            const earned = badges.some(r => r.badge_key === b.key);
            return (
              <div
                key={b.key}
                className="flex flex-col items-center gap-1.5 rounded-2xl py-4 px-2 transition-all duration-200"
                style={{
                  backgroundColor: earned ? `${accent}18` : (isDarkish ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                  border: `1.5px solid ${earned ? `${accent}33` : 'transparent'}`,
                  opacity: earned ? 1 : 0.45,
                  filter: earned ? 'none' : 'grayscale(1)',
                }}
              >
                <span className="text-2xl leading-none">{b.emoji}</span>
                <p className="text-[10px] font-bold text-center leading-tight" style={{ color: earned ? accent : subtext }}>
                  {b.name}
                </p>
                {earned && (
                  <p className="text-[9px] text-center leading-tight opacity-60" style={{ color: tokens.text }}>
                    {b.desc}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Ressourcetendenser fold-out */}
      <section
        className="rounded-3xl overflow-hidden"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : tokens.shadow }}
      >
        <button
          type="button"
          onClick={() => setTrendOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <h2 className="text-sm font-bold">Ressourcetendenser</h2>
          <span className="text-sm transition-transform duration-200" style={{ transform: trendOpen ? 'rotate(180deg)' : 'none', color: tokens.textMuted }}>
            ↓
          </span>
        </button>
        {trendOpen && (
          <div className="px-5 pb-5 space-y-3">
            {[
              { label: 'Energi',   val: 3.8, delta: +0.3 },
              { label: 'Stemning', val: 3.5, delta: -0.2 },
              { label: 'Søvn',     val: 3.2, delta: +0.5 },
              { label: 'Social',   val: 2.9, delta: 0 },
              { label: 'Stress',   val: 2.5, delta: -0.4 },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <p className="text-sm font-medium w-20 shrink-0">{r.label}</p>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${accent}14` }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(r.val / 5) * 100}%`, backgroundColor: accent }}
                  />
                </div>
                <span
                  className="text-xs font-bold w-6 text-right"
                  style={{ color: r.delta > 0 ? '#22C55E' : r.delta < 0 ? '#EF4444' : subtext }}
                >
                  {r.delta > 0 ? `+${r.delta}` : r.delta === 0 ? '→' : r.delta}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ressourceblomst */}
      <section
        className="rounded-3xl p-5"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : tokens.shadow }}
      >
        <h2 className="text-sm font-bold mb-3">Ressourceblomst 🌸</h2>
        <button
          type="button"
          onClick={onOpenBlomst}
          className={`min-h-[52px] w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] ${
            !flowerFilledThisWeek && !reducedMotion ? 'animate-pulse' : ''
          }`}
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            boxShadow: !flowerFilledThisWeek ? `0 0 0 4px ${accent}33` : undefined,
          }}
        >
          {!flowerFilledThisWeek ? 'Din blomst venter 🌸' : 'Opdater din blomst'}
        </button>
      </section>

      {/* Crisis card */}
      <section className="rounded-3xl p-5" style={{ backgroundColor: '#FFF1F2', border: '1.5px solid #FECDD3' }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🆘</span>
          <div>
            <h2 className="text-sm font-bold text-rose-900">Har du brug for hjælp?</h2>
            <p className="text-xs text-rose-700 mt-0.5">Du behøver ikke klare det alene.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCrisis}
          className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98]"
          style={{ backgroundColor: '#E11D48', boxShadow: '0 4px 16px rgba(225,29,72,0.25)' }}
        >
          Åbn krise-støtte
        </button>
        <button
          type="button"
          onClick={onOpenKrisePlan}
          className="w-full rounded-2xl py-3.5 text-sm font-bold transition-all duration-200 active:scale-[0.98]"
          style={{ backgroundColor: '#fef2f2', color: '#E11D48', border: '1.5px solid #fecaca' }}
        >
          📋 Min kriseplan
        </button>
      </section>

    </div>
  );
}

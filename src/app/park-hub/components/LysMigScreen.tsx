'use client';

import React, { useMemo, useState } from 'react';
import ResourceFlower from './ResourceFlower';
import GoalLadder from './GoalLadder';
import type { LysThemeTokens } from '../lib/lysTheme';

const MOCK_WINS = [
  { date: '22. mar', text: 'Jeg fik ringet til min søster.' },
  { date: '23. mar', text: 'Gik en tur selv om det var svært at komme ud.' },
  { date: '24. mar', text: 'Hjalp med at dække bord til middag.' },
  { date: '25. mar', text: 'Fik sovet en time mere end i går.' },
  { date: '26. mar', text: 'Skrev tre linjer i dagbogen.' },
];

type MoodDay = { day: string; emoji: string; note?: string; moodKey: string };

const MOOD_WEEK: MoodDay[] = [
  { day: 'Man', emoji: '😊', moodKey: 'god', note: 'Rolig dag' },
  { day: 'Tir', emoji: '😐', moodKey: 'okay', note: '' },
  { day: 'Ons', emoji: '😟', moodKey: 'tung', note: 'Mange tanker' },
  { day: 'Tor', emoji: '😊', moodKey: 'god', note: '' },
  { day: 'Fre', emoji: '🌤', moodKey: 'okay', note: 'God snak med Sara' },
  { day: 'Lør', emoji: '😊', moodKey: 'god', note: '' },
  { day: 'Søn', emoji: '🙂', moodKey: 'okay', note: 'I dag' },
];

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  initials: string;
  reducedMotion: boolean;
  flowerFilledThisWeek?: boolean;
  onOpenBlomst: () => void;
};

export default function LysMigScreen({
  tokens,
  accent,
  firstName,
  initials,
  reducedMotion,
  flowerFilledThisWeek = false,
  onOpenBlomst,
}: Props) {
  const [showAllGoals, setShowAllGoals] = useState(false);
  const [selectedMoodIdx, setSelectedMoodIdx] = useState<number | null>(null);
  const todayIdx = 6;

  const isDarkish =
    tokens.bg === '#0F1B2D' || tokens.bg === '#0A1220' || tokens.text.toLowerCase().includes('e2e8f0');

  const cardBg = isDarkish ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.75)';
  const borderCol = isDarkish ? 'rgba(255,255,255,0.1)' : tokens.cardBorder;
  const subtext = isDarkish ? 'rgba(255,255,255,0.45)' : tokens.textMuted;
  const titleColor = tokens.text;

  const activeGoalTitle = 'Komme ud af huset dagligt';
  const stepsDone = 2;
  const stepsTotal = 5;
  const progressPct = Math.round((stepsDone / stepsTotal) * 100);
  const stepCompletedToday = true;

  const selectedNote = useMemo(
    () => (selectedMoodIdx !== null ? MOOD_WEEK[selectedMoodIdx]?.note : null),
    [selectedMoodIdx],
  );

  return (
    <div
      className="space-y-5 px-4 pb-8 pt-4 transition-all duration-200"
      style={{ color: titleColor }}
    >
      {/* ── Profile hero ─────────────────────────────────────────────────── */}
      <section
        className="rounded-3xl p-6 transition-all duration-200"
        style={{
          background: `linear-gradient(155deg, ${accent}20 0%, ${accent}06 100%)`,
          border: `1px solid ${accent}20`,
        }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div
            className="h-20 w-20 shrink-0 rounded-full flex items-center justify-center text-xl font-black text-white"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
              boxShadow: `0 6px 24px ${accent}40`,
            }}
          >
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-black leading-tight">{firstName}</h1>
            <p className="text-sm mt-0.5" style={{ color: subtext }}>Dit rum i Lys</p>
          </div>
        </div>

        <div className="flex items-center gap-0">
          <div className="flex-1 text-center">
            <p className="text-2xl font-black" style={{ color: accent }}>{MOCK_WINS.length * 20}</p>
            <p className="text-xs mt-0.5" style={{ color: subtext }}>XP denne uge</p>
          </div>
          <div className="w-px h-10 self-center" style={{ backgroundColor: `${accent}25` }} />
          <div className="flex-1 text-center">
            <p className="text-2xl font-black">🔥 5</p>
            <p className="text-xs mt-0.5" style={{ color: subtext }}>dages streak</p>
          </div>
          <div className="w-px h-10 self-center" style={{ backgroundColor: `${accent}25` }} />
          <div className="flex-1 text-center">
            <p className="text-2xl font-black" style={{ color: accent }}>{MOCK_WINS.length}</p>
            <p className="text-xs mt-0.5" style={{ color: subtext }}>sejre</p>
          </div>
        </div>
      </section>

      {/* Ressourceblomst */}
      <section
        className="rounded-3xl p-5 transition-all duration-200"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : '0 2px 16px rgba(0,0,0,0.06)' }}
      >
        <h2 className="mb-3 text-lg font-bold">Ressourceblomst</h2>
        <div className="overflow-hidden rounded-xl">
          <ResourceFlower />
        </div>
        <button
          type="button"
          onClick={onOpenBlomst}
          className={`relative mt-4 min-h-[48px] w-full rounded-xl py-3 text-base font-semibold text-white transition-all duration-200 ${
            !flowerFilledThisWeek && !reducedMotion ? 'animate-pulse' : ''
          }`}
          style={{
            backgroundColor: accent,
            boxShadow: !flowerFilledThisWeek ? `0 0 0 4px ${accent}55` : undefined,
          }}
        >
          {!flowerFilledThisWeek ? <span className="block">Din blomst venter 🌸</span> : null}
          <span className="block">Opdater din blomst</span>
        </button>
      </section>

      {/* Måltrappe */}
      <section
        className="rounded-3xl p-5 transition-all duration-200"
        style={{
          backgroundColor: cardBg,
          boxShadow: stepCompletedToday
            ? `0 0 32px rgba(34,197,94,0.22)`
            : (isDarkish ? 'none' : '0 2px 16px rgba(0,0,0,0.06)'),
        }}
      >
        <h2 className="mb-2 text-lg font-bold">Måltrappe</h2>
        <p className="mb-1 text-base font-semibold">{activeGoalTitle}</p>
        <p className="mb-3 text-base opacity-80">Trin {stepsDone + 1} af {stepsTotal}</p>
        <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{ width: `${progressPct}%`, backgroundColor: accent }}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAllGoals(s => !s)}
          className="min-h-[48px] w-full rounded-xl border py-3 text-base font-semibold transition-all duration-200"
          style={{ borderColor: borderCol, color: accent }}
        >
          {showAllGoals ? 'Skjul alle mål' : 'Se alle mål'}
        </button>
        {showAllGoals ? (
          <div className="mt-4 rounded-xl border p-2" style={{ borderColor: borderCol }}>
            <GoalLadder />
          </div>
        ) : null}
      </section>

      {/* Sejrsdagbog */}
      <section className="rounded-3xl p-5 transition-all duration-200" style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : '0 2px 16px rgba(0,0,0,0.06)' }}>
        <h2 className="mb-4 text-lg font-bold">Dine sejre 🌟</h2>
        {MOCK_WINS.length === 0 ? (
          <div className="text-center">
            <p className="text-base opacity-80">Ingen sejre endnu — hvad gik godt i dag?</p>
            <button
              type="button"
              className="mt-4 min-h-[48px] rounded-full px-6 py-3 text-base font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Fortæl Lys en lille sejr
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {MOCK_WINS.map(w => (
              <li
                key={w.date + w.text}
                className="rounded-xl border p-3 transition-all duration-200"
                style={{ backgroundColor: isDarkish ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)', borderColor: borderCol }}
              >
                <p className="text-xs" style={{ color: subtext }}>
                  {w.date}
                </p>
                <p className="mt-1 text-base font-medium" style={{ color: isDarkish ? '#fff' : tokens.text }}>
                  {w.text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Stemningshistorik */}
      <section className="rounded-3xl p-5 transition-all duration-200" style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : '0 2px 16px rgba(0,0,0,0.06)' }}>
        <h2 className="mb-4 text-lg font-bold">Din stemning den seneste uge</h2>
        <div className="flex flex-wrap justify-between gap-2">
          {MOOD_WEEK.map((d, i) => {
            const isToday = i === todayIdx;
            return (
              <button
                key={d.day}
                type="button"
                onClick={() => setSelectedMoodIdx(i)}
                className="flex min-h-[48px] min-w-[44px] flex-col items-center gap-1 rounded-xl p-2 transition-all duration-200"
                style={{
                  boxShadow: isToday ? `0 0 0 3px ${accent}88` : undefined,
                  transform: isToday ? 'scale(1.12)' : undefined,
                }}
                aria-pressed={selectedMoodIdx === i}
              >
                <span className="text-2xl" aria-hidden>
                  {d.emoji}
                </span>
                <span className="text-xs font-medium opacity-70">{d.day}</span>
              </button>
            );
          })}
        </div>
        {selectedNote ? (
          <p className="mt-4 rounded-xl border p-3 text-base" style={{ borderColor: borderCol }}>
            Note: {selectedNote}
          </p>
        ) : selectedMoodIdx !== null && !MOOD_WEEK[selectedMoodIdx]?.note ? (
          <p className="mt-4 text-base opacity-60">Ingen note den dag.</p>
        ) : null}
      </section>
    </div>
  );
}

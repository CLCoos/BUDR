'use client';

import React from 'react';
import { Droplets, Flame, Palette, Share2, Sparkles } from 'lucide-react';
import type { HavenQuest } from '@/lib/havenGamification';

type Props = {
  gardenerTitle: string;
  gardenerSub: string;
  level: number;
  xpPct: number;
  totalXp: number;
  nextXp: number;
  streakDays: number;
  waterCredits: number;
  quests: HavenQuest[];
  onStyle: () => void;
  onShare: () => void;
};

export function HavenTopHud({
  gardenerTitle,
  gardenerSub,
  level,
  xpPct,
  totalXp,
  nextXp,
  streakDays,
  waterCredits,
  quests,
  onStyle,
  onShare,
}: Props) {
  const doneQuests = quests.filter((q) => q.done).length;

  return (
    <div className="relative z-10 mx-3 mb-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            <p className="truncate text-sm font-black text-white">{gardenerTitle}</p>
            <span className="shrink-0 rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
              Lv.{level}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-white/60 leading-snug line-clamp-2">
            {gardenerSub}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-700"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-white/45">
            {level >= 5
              ? 'Topniveau nået — du er en mester 🌳'
              : `${totalXp} / ${nextXp} XP til næste niveau`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 rounded-full bg-orange-500/20 px-2.5 py-1 text-[11px] font-bold text-orange-100">
            <Flame className="h-3.5 w-3.5" />
            {streakDays > 0 ? `${streakDays}d` : 'Start stime'}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-sky-500/20 px-2.5 py-1 text-[11px] font-bold text-sky-100">
            <Droplets className="h-3.5 w-3.5" />
            {waterCredits}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {quests.map((q) => (
            <span
              key={q.id}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold"
              style={{
                backgroundColor: q.done ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)',
                color: q.done ? '#6ee7b7' : 'rgba(255,255,255,0.55)',
              }}
            >
              <span>{q.emoji}</span>
              {q.label.slice(0, 42)}
              {q.done ? ' ✓' : ''}
            </span>
          ))}
        </div>
        <span className="text-[10px] font-bold text-white/40">
          {doneQuests}/{quests.length}
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onStyle}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/10"
        >
          <Palette className="h-4 w-4 text-emerald-300" />
          Udtryk &amp; himmel
        </button>
        <button
          type="button"
          onClick={onShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500/90 to-orange-400/90 py-2.5 text-xs font-black text-white shadow-lg shadow-fuchsia-500/20"
        >
          <Share2 className="h-4 w-4" />
          Del øjeblik
        </button>
      </div>
    </div>
  );
}

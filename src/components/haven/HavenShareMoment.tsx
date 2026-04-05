'use client';

import React, { useCallback } from 'react';
import { Copy, Share2, X } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Vises på kortet — fornavn eller “min” */
  displayName: string;
  vibeLine: string;
  plantCount: number;
  maturePlants: number;
  streakDays: number;
  gardenerTitle: string;
  level: number;
  totalXp: number;
};

export function HavenShareMoment({
  open,
  onClose,
  displayName,
  vibeLine,
  plantCount,
  maturePlants,
  streakDays,
  gardenerTitle,
  level,
  totalXp,
}: Props) {
  const caption = useCallback(() => {
    const lines = [
      `🌿 Min BUDR-have`,
      vibeLine,
      '',
      `✦ ${gardenerTitle} · niveau ${level}`,
      `🪴 ${plantCount} planter · ${maturePlants} i fuld blomst`,
      streakDays > 0 ? `🔥 ${streakDays} dages stime` : '',
      '',
      'Lys · BUDR Care',
    ];
    return lines.filter(Boolean).join('\n');
  }, [vibeLine, gardenerTitle, level, plantCount, maturePlants, streakDays]);

  const copyCaption = () => {
    void navigator.clipboard.writeText(caption());
    toast.success('Tekst kopieret — sæt den på Instagram ✨');
  };

  const nativeShare = async () => {
    const text = caption();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Min BUDR-have', text });
        return;
      }
    } catch {
      /* fallback */
    }
    copyCaption();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Luk"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 9:16 story-kort — optimeret til skærmbillede */}
        <div
          className="relative mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-[2rem] shadow-[0_0_0_4px_rgba(255,255,255,0.12),0_24px_80px_rgba(0,0,0,0.55)]"
          style={{
            background:
              'linear-gradient(165deg, #0f172a 0%, #134e4a 28%, #115e59 52%, #0f766e 78%, #022c22 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(167,243,208,0.5) 0%, transparent 55%)',
            }}
          />
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-amber-200/15 to-transparent" />

          <div className="relative flex h-full flex-col px-7 pt-14 pb-10 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-emerald-200/80">
              BUDR · Lys
            </p>
            <h3 className="mt-3 font-serif text-3xl font-light leading-tight tracking-tight">
              {displayName}
              <span className="block text-lg font-normal text-emerald-100/90 mt-1">
                har groet noget smukt
              </span>
            </h3>

            <p className="mt-8 text-base font-medium leading-relaxed text-emerald-50/95 italic">
              “{vibeLine}”
            </p>

            <div className="mt-auto space-y-3 rounded-2xl border border-white/15 bg-black/25 px-5 py-4 backdrop-blur-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-200/80">Titel</span>
                <span className="font-bold text-amber-100">{gardenerTitle}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-200/80">Niveau</span>
                <span className="font-black tabular-nums">
                  {level} · {totalXp} XP
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-200/80">Have</span>
                <span className="font-bold">
                  {plantCount} planter · {maturePlants} fuldt groet
                </span>
              </div>
              {streakDays > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-200/80">Stime</span>
                  <span className="font-bold text-orange-200">{streakDays} dage 🔥</span>
                </div>
              )}
            </div>

            <p className="mt-5 text-center text-[10px] font-semibold uppercase tracking-widest text-white/35">
              Tag skærmbillede · del på Instagram eller Stories
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={copyCaption}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-3.5 text-sm font-bold text-white"
          >
            <Copy className="h-4 w-4" />
            Kopier tekst
          </button>
          <button
            type="button"
            onClick={() => void nativeShare()}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 py-3.5 text-sm font-black text-slate-900 shadow-lg"
          >
            <Share2 className="h-4 w-4" />
            Del
          </button>
        </div>
      </div>
    </div>
  );
}

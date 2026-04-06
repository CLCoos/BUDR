'use client';

import React, { useEffect, useState } from 'react';
import { phaseDaLabel, type LysPhase, type LysThemeTokens } from '../lib/lysTheme';

/*
 * Supabase (senere): hent ugeopsummering — park_lys_conversation_history, humør m.m.
 */

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  phase: LysPhase;
  reducedMotion: boolean;
};

export default function LysUgeTilbageblik({ tokens, accent, firstName, phase, reducedMotion }: Props) {
  const [themeLine, setThemeLine] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/lys-chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: `Skriv én kort, varm sætning (max 2) til ${firstName} som opsummerer ugen i Lys. Tal: 5 gange har de sagt hej til Lys, humør-snittet har været 😊. Ingen klinisk tone.`,
              },
            ],
            residentFirstName: firstName,
            timeOfDay: phaseDaLabel(phase),
            mood: null,
            sessionContext: '',
          }),
        });
        const data = (await res.json()) as { text?: string; error?: string };
        if (!cancelled) setThemeLine(data.text ?? data.error ?? null);
      } catch {
        if (!cancelled) setThemeLine(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [firstName, phase]);

  const checkIns = 5;
  const avgEmoji = '😊';

  const dur = reducedMotion ? '0ms' : '400ms';

  return (
    <section
      className="rounded-2xl border p-6 shadow-inner transition-all"
      style={{
        borderColor: tokens.cardBorder,
        background: `linear-gradient(135deg, ${tokens.gradientFrom}, ${tokens.gradientTo})`,
        color: tokens.text,
        transitionDuration: dur,
      }}
      aria-labelledby="lys-uge-heading"
    >
      <h2 id="lys-uge-heading" className="text-center text-2xl font-bold">
        Hej {firstName} 🌟 Her er din uge i Lys.
      </h2>

      <div className="mt-8 grid grid-cols-2 gap-4 text-center">
        <div className="rounded-2xl p-4" style={{ backgroundColor: tokens.cardBg }}>
          <p className="text-lg opacity-70">Gange du sagde hej</p>
          <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: accent }}>
            {checkIns}
          </p>
        </div>
        <div className="rounded-2xl p-4" style={{ backgroundColor: tokens.cardBg }}>
          <p className="text-lg opacity-70">Humør i snit</p>
          <p className="mt-2 text-4xl" aria-label="Humør">
            {avgEmoji}
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-8">
        <WeekFlower label="Denne uge" accent={accent} fill={0.75} tokens={tokens} />
        <WeekFlower label="Sidste uge" accent={accent} fill={0.5} muted tokens={tokens} />
      </div>

      {themeLine ? (
        <p className="mt-8 text-center text-lg leading-relaxed opacity-90">{themeLine}</p>
      ) : (
        <p className="mt-8 text-center text-lg opacity-70">Lys samler tankerne …</p>
      )}

      <p className="mt-10 text-center text-xl font-semibold">Du er her. Det betyder noget.</p>
    </section>
  );
}

function WeekFlower({
  label,
  accent,
  fill,
  tokens,
  muted,
}: {
  label: string;
  accent: string;
  fill: number;
  tokens: LysThemeTokens;
  muted?: boolean;
}) {
  return (
    <div className="text-center">
      <svg width="80" height="80" viewBox="0 0 80 80" className="mx-auto" aria-hidden>
        <circle cx="40" cy="40" r="10" fill={accent} opacity={muted ? 0.35 : 0.85} />
        {[0, 72, 144, 216, 288].map((rot, i) => (
          <ellipse
            key={rot}
            cx="40"
            cy="22"
            rx="10"
            ry="18"
            fill={i / 5 < fill ? accent : `${tokens.text}18`}
            transform={`rotate(${rot} 40 40)`}
            opacity={muted ? 0.5 : 1}
          />
        ))}
      </svg>
      <p className="mt-2 text-base font-medium opacity-80">{label}</p>
    </div>
  );
}

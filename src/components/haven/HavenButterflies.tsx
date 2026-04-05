'use client';

import React from 'react';

const SPOTS = [
  { l: '12%', t: '38%', d: '0s', sym: '🦋' },
  { l: '78%', t: '32%', d: '-4s', sym: '🐝' },
  { l: '44%', t: '48%', d: '-7s', sym: '✦' },
  { l: '68%', t: '52%', d: '-2s', sym: '🦋' },
];

type Props = { active: boolean };

export function HavenButterflies({ active }: Props) {
  if (!active) return null;
  return (
    <div className="haven-butterfly-layer" aria-hidden>
      {SPOTS.map((s, i) => (
        <span
          key={i}
          className="haven-butterfly"
          style={{ left: s.l, top: s.t, animationDelay: s.d }}
        >
          {s.sym}
        </span>
      ))}
    </div>
  );
}

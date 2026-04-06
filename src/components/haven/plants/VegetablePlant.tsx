import React from 'react';

type Props = { stage: 0 | 1 | 2 | 3 | 4; accent?: string };

export default function VegetablePlant({ stage, accent = '#EF4444' }: Props) {
  const stem  = '#22C55E';
  const leaf  = '#16A34A';
  const fruit = accent;

  if (stage === 0) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <line x1="40" y1="88" x2="40" y2="74" stroke={stem} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="40" cy="71" rx="4" ry="5" fill={leaf} />
    </svg>
  );

  if (stage === 1) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <line x1="40" y1="88" x2="40" y2="60" stroke={stem} strokeWidth="3" strokeLinecap="round" />
      <path d="M40 74 Q26 68 22 58 Q33 60 40 74Z" fill={leaf} />
      <path d="M40 74 Q54 68 58 58 Q47 60 40 74Z" fill={leaf} opacity="0.85" />
      <ellipse cx="40" cy="58" rx="5" ry="6" fill={leaf} />
    </svg>
  );

  if (stage === 2) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <line x1="40" y1="88" x2="40" y2="50" stroke={stem} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M40 76 Q22 68 18 54 Q32 56 40 76Z" fill={leaf} />
      <path d="M40 76 Q58 68 62 54 Q48 56 40 76Z" fill={leaf} opacity="0.85" />
      <path d="M40 63 Q24 54 22 42 Q34 44 40 63Z" fill={leaf} opacity="0.88" />
      <path d="M40 63 Q56 54 58 42 Q46 44 40 63Z" fill={leaf} opacity="0.8" />
      <ellipse cx="40" cy="49" rx="6" ry="7" fill={leaf} />
      {/* small fruit bud */}
      <ellipse cx="34" cy="70" rx="4" ry="5" fill={fruit} opacity="0.7" />
    </svg>
  );

  if (stage === 3) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <line x1="40" y1="88" x2="40" y2="42" stroke={stem} strokeWidth="4" strokeLinecap="round" />
      <path d="M40 78 Q18 68 14 50 Q30 52 40 78Z" fill={leaf} />
      <path d="M40 78 Q62 68 66 50 Q50 52 40 78Z" fill={leaf} opacity="0.85" />
      <path d="M40 65 Q20 54 16 38 Q32 40 40 65Z" fill={leaf} opacity="0.88" />
      <path d="M40 65 Q60 54 64 38 Q48 40 40 65Z" fill={leaf} opacity="0.8" />
      <path d="M40 52 Q26 40 24 28 Q38 32 40 52Z" fill={leaf} opacity="0.85" />
      <path d="M40 52 Q54 40 56 28 Q42 32 40 52Z" fill={leaf} opacity="0.78" />
      <ellipse cx="40" cy="40" rx="7" ry="8" fill={leaf} />
      {/* fruits */}
      <ellipse cx="30" cy="72" rx="6" ry="7" fill={fruit} opacity="0.9" />
      <ellipse cx="50" cy="68" rx="5" ry="6" fill={fruit} opacity="0.85" />
      <ellipse cx="38" cy="62" rx="4" ry="5" fill={fruit} opacity="0.75" />
    </svg>
  );

  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <line x1="40" y1="90" x2="40" y2="36" stroke={stem} strokeWidth="4.5" strokeLinecap="round" />
      <line x1="40" y1="72" x2="26" y2="80" stroke={stem} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="40" y1="72" x2="54" y2="80" stroke={stem} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 80 Q14 68 10 46 Q28 48 40 80Z" fill={leaf} />
      <path d="M40 80 Q66 68 70 46 Q52 48 40 80Z" fill={leaf} opacity="0.85" />
      <path d="M40 66 Q18 54 14 34 Q30 36 40 66Z" fill={leaf} opacity="0.88" />
      <path d="M40 66 Q62 54 66 34 Q50 36 40 66Z" fill={leaf} opacity="0.8" />
      <path d="M40 52 Q22 38 20 22 Q36 26 40 52Z" fill={leaf} opacity="0.85" />
      <path d="M40 52 Q58 38 60 22 Q44 26 40 52Z" fill={leaf} opacity="0.78" />
      <ellipse cx="40" cy="34" rx="8" ry="9" fill={leaf} />
      {/* ripe fruits on branches */}
      <ellipse cx="26" cy="83" rx="7" ry="8" fill={fruit} opacity="0.92" />
      <ellipse cx="54" cy="83" rx="7" ry="8" fill={fruit} opacity="0.88" />
      <ellipse cx="28" cy="70" rx="6" ry="7" fill={fruit} opacity="0.85" />
      <ellipse cx="52" cy="66" rx="5" ry="6" fill={fruit} opacity="0.82" />
      <ellipse cx="40" cy="60" rx="5" ry="6" fill={fruit} opacity="0.78" />
      {/* shine dots */}
      <circle cx="28" cy="68" r="1.5" fill="white" opacity="0.5" />
      <circle cx="54" cy="82" r="1.5" fill="white" opacity="0.5" />
    </svg>
  );
}

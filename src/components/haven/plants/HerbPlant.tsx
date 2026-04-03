import React from 'react';

type Props = { stage: 0 | 1 | 2 | 3 | 4; accent?: string };

export default function HerbPlant({ stage, accent = '#10B981' }: Props) {
  const stem = accent;
  const leaf = `${accent}dd`;

  if (stage === 0)
    return (
      <svg
        viewBox="0 0 80 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <line
          x1="40"
          y1="86"
          x2="40"
          y2="72"
          stroke={stem}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse cx="40" cy="69" rx="4" ry="5" fill={leaf} />
      </svg>
    );

  if (stage === 1)
    return (
      <svg
        viewBox="0 0 80 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <line x1="40" y1="86" x2="40" y2="62" stroke={stem} strokeWidth="3" strokeLinecap="round" />
        <path d="M40 72 Q28 64 26 55 Q35 57 40 72Z" fill={leaf} />
        <path d="M40 72 Q52 64 54 55 Q45 57 40 72Z" fill={leaf} opacity="0.85" />
        <ellipse cx="40" cy="60" rx="5" ry="6" fill={leaf} />
      </svg>
    );

  if (stage === 2)
    return (
      <svg
        viewBox="0 0 80 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <line x1="40" y1="86" x2="40" y2="50" stroke={stem} strokeWidth="3" strokeLinecap="round" />
        <path d="M40 75 Q22 65 18 52 Q32 55 40 75Z" fill={leaf} />
        <path d="M40 75 Q58 65 62 52 Q48 55 40 75Z" fill={leaf} opacity="0.85" />
        <path d="M40 62 Q26 52 24 41 Q36 44 40 62Z" fill={leaf} opacity="0.9" />
        <path d="M40 62 Q54 52 56 41 Q44 44 40 62Z" fill={leaf} opacity="0.8" />
        <ellipse cx="40" cy="48" rx="6" ry="7" fill={leaf} />
      </svg>
    );

  if (stage === 3)
    return (
      <svg
        viewBox="0 0 80 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <line
          x1="40"
          y1="88"
          x2="40"
          y2="44"
          stroke={stem}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path d="M40 80 Q18 68 14 50 Q30 54 40 80Z" fill={leaf} />
        <path d="M40 80 Q62 68 66 50 Q50 54 40 80Z" fill={leaf} opacity="0.85" />
        <path d="M40 66 Q22 54 18 38 Q34 42 40 66Z" fill={leaf} opacity="0.9" />
        <path d="M40 66 Q58 54 62 38 Q46 42 40 66Z" fill={leaf} opacity="0.8" />
        <path d="M40 52 Q28 40 26 28 Q38 32 40 52Z" fill={leaf} opacity="0.88" />
        <path d="M40 52 Q52 40 54 28 Q42 32 40 52Z" fill={leaf} opacity="0.78" />
        <ellipse cx="40" cy="42" rx="7" ry="8" fill={leaf} />
      </svg>
    );

  return (
    <svg
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <line x1="40" y1="90" x2="40" y2="38" stroke={stem} strokeWidth="4" strokeLinecap="round" />
      <line x1="40" y1="70" x2="28" y2="82" stroke={stem} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="40" y1="70" x2="52" y2="82" stroke={stem} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 82 Q14 68 10 46 Q28 50 40 82Z" fill={leaf} />
      <path d="M40 82 Q66 68 70 46 Q52 50 40 82Z" fill={leaf} opacity="0.85" />
      <path d="M40 68 Q18 54 14 34 Q32 38 40 68Z" fill={leaf} opacity="0.88" />
      <path d="M40 68 Q62 54 66 34 Q48 38 40 68Z" fill={leaf} opacity="0.8" />
      <path d="M40 52 Q24 38 22 22 Q36 26 40 52Z" fill={leaf} opacity="0.9" />
      <path d="M40 52 Q56 38 58 22 Q44 26 40 52Z" fill={leaf} opacity="0.82" />
      <ellipse
        cx="28"
        cy="85"
        rx="8"
        ry="5"
        fill={leaf}
        opacity="0.7"
        transform="rotate(-20 28 85)"
      />
      <ellipse
        cx="52"
        cy="85"
        rx="8"
        ry="5"
        fill={leaf}
        opacity="0.65"
        transform="rotate(20 52 85)"
      />
      <ellipse cx="40" cy="36" rx="8" ry="9" fill={leaf} />
    </svg>
  );
}

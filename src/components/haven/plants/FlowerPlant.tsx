import React from 'react';

type Props = { stage: 0 | 1 | 2 | 3 | 4; accent?: string };

export default function FlowerPlant({ stage, accent = '#F59E0B' }: Props) {
  const stem = '#22C55E';
  const petal = accent;
  const center = '#FEF3C7';

  if (stage === 0) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <line x1="40" y1="85" x2="40" y2="68" stroke={stem} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="40" cy="65" rx="5" ry="6" fill={stem} opacity="0.8" />
    </svg>
  );

  if (stage === 1) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <line x1="40" y1="85" x2="40" y2="58" stroke={stem} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="29" cy="72" rx="7" ry="5" fill={stem} opacity="0.7" transform="rotate(-30 29 72)" />
      <ellipse cx="40" cy="54" rx="7" ry="8" fill={petal} opacity="0.85" />
      <ellipse cx="40" cy="54" rx="4" ry="4" fill={center} />
    </svg>
  );

  if (stage === 2) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <line x1="40" y1="85" x2="40" y2="52" stroke={stem} strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="27" cy="67" rx="9" ry="6" fill={stem} opacity="0.7" transform="rotate(-35 27 67)" />
      <ellipse cx="53" cy="70" rx="9" ry="6" fill={stem} opacity="0.6" transform="rotate(25 53 70)" />
      {/* petals */}
      <ellipse cx="40" cy="40" rx="7" ry="12" fill={petal} opacity="0.88" />
      <ellipse cx="52" cy="48" rx="12" ry="7" fill={petal} opacity="0.88" transform="rotate(30 52 48)" />
      <ellipse cx="28" cy="48" rx="12" ry="7" fill={petal} opacity="0.88" transform="rotate(-30 28 48)" />
      <ellipse cx="40" cy="56" rx="7" ry="12" fill={petal} opacity="0.88" />
      <circle cx="40" cy="48" r="6" fill={center} />
    </svg>
  );

  if (stage === 3) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <line x1="40" y1="86" x2="40" y2="46" stroke={stem} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="25" cy="63" rx="11" ry="7" fill={stem} opacity="0.7" transform="rotate(-35 25 63)" />
      <ellipse cx="55" cy="67" rx="11" ry="7" fill={stem} opacity="0.65" transform="rotate(30 55 67)" />
      {[0,45,90,135,180,225,270,315].map((angle, i) => (
        <ellipse
          key={i}
          cx={40 + 13 * Math.cos((angle * Math.PI) / 180)}
          cy={36 + 13 * Math.sin((angle * Math.PI) / 180)}
          rx="7" ry="11"
          fill={petal}
          opacity="0.85"
          transform={`rotate(${angle} ${40 + 13 * Math.cos((angle * Math.PI) / 180)} ${36 + 13 * Math.sin((angle * Math.PI) / 180)})`}
        />
      ))}
      <circle cx="40" cy="36" r="8" fill={center} />
      <circle cx="40" cy="36" r="4" fill={`${petal}88`} />
    </svg>
  );

  // Stage 4: full bloom
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <line x1="40" y1="88" x2="40" y2="44" stroke={stem} strokeWidth="4.5" strokeLinecap="round" />
      <ellipse cx="23" cy="60" rx="13" ry="8" fill={stem} opacity="0.7" transform="rotate(-38 23 60)" />
      <ellipse cx="57" cy="65" rx="13" ry="8" fill={stem} opacity="0.65" transform="rotate(32 57 65)" />
      {/* outer petals */}
      {[0,40,80,120,160,200,240,280,320].map((angle, i) => (
        <ellipse
          key={`o${i}`}
          cx={40 + 17 * Math.cos((angle * Math.PI) / 180)}
          cy={32 + 17 * Math.sin((angle * Math.PI) / 180)}
          rx="6" ry="13"
          fill={petal}
          opacity="0.78"
          transform={`rotate(${angle} ${40 + 17 * Math.cos((angle * Math.PI) / 180)} ${32 + 17 * Math.sin((angle * Math.PI) / 180)})`}
        />
      ))}
      {/* inner petals */}
      {[20,60,100,140,180,220,260,300].map((angle, i) => (
        <ellipse
          key={`i${i}`}
          cx={40 + 10 * Math.cos((angle * Math.PI) / 180)}
          cy={32 + 10 * Math.sin((angle * Math.PI) / 180)}
          rx="5" ry="9"
          fill={`${petal}cc`}
          opacity="0.88"
          transform={`rotate(${angle} ${40 + 10 * Math.cos((angle * Math.PI) / 180)} ${32 + 10 * Math.sin((angle * Math.PI) / 180)})`}
        />
      ))}
      <circle cx="40" cy="32" r="10" fill={center} />
      <circle cx="40" cy="32" r="5" fill={`${petal}aa`} />
    </svg>
  );
}

import React from 'react';

type Props = { stage: 0 | 1 | 2 | 3 | 4; accent?: string };

export default function BushPlant({ stage, accent = '#7F77DD' }: Props) {
  const base = accent;
  const mid  = `${accent}cc`;
  const dark = `${accent}88`;

  if (stage === 0) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <ellipse cx="40" cy="78" rx="10" ry="8" fill={base} opacity="0.85" />
    </svg>
  );

  if (stage === 1) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <ellipse cx="40" cy="76" rx="16" ry="12" fill={base} opacity="0.88" />
      <ellipse cx="27" cy="72" rx="11" ry="9" fill={mid} opacity="0.82" />
      <ellipse cx="53" cy="72" rx="11" ry="9" fill={mid} opacity="0.82" />
    </svg>
  );

  if (stage === 2) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <ellipse cx="40" cy="74" rx="22" ry="15" fill={base} opacity="0.88" />
      <ellipse cx="22" cy="68" rx="15" ry="12" fill={mid} opacity="0.82" />
      <ellipse cx="58" cy="68" rx="15" ry="12" fill={mid} opacity="0.82" />
      <ellipse cx="40" cy="62" rx="16" ry="12" fill={base} opacity="0.78" />
      <ellipse cx="40" cy="78" rx="14" ry="8" fill={dark} opacity="0.5" />
    </svg>
  );

  if (stage === 3) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <ellipse cx="40" cy="76" rx="28" ry="16" fill={base} opacity="0.88" />
      <ellipse cx="18" cy="66" rx="18" ry="14" fill={mid} opacity="0.82" />
      <ellipse cx="62" cy="66" rx="18" ry="14" fill={mid} opacity="0.82" />
      <ellipse cx="40" cy="58" rx="20" ry="15" fill={base} opacity="0.82" />
      <ellipse cx="26" cy="54" rx="13" ry="10" fill={mid} opacity="0.75" />
      <ellipse cx="54" cy="54" rx="13" ry="10" fill={mid} opacity="0.75" />
      <ellipse cx="40" cy="80" rx="18" ry="8" fill={dark} opacity="0.45" />
    </svg>
  );

  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <ellipse cx="40" cy="78" rx="34" ry="18" fill={base} opacity="0.88" />
      <ellipse cx="14" cy="65" rx="20" ry="16" fill={mid} opacity="0.82" />
      <ellipse cx="66" cy="65" rx="20" ry="16" fill={mid} opacity="0.82" />
      <ellipse cx="40" cy="55" rx="24" ry="18" fill={base} opacity="0.85" />
      <ellipse cx="22" cy="50" rx="16" ry="13" fill={mid} opacity="0.78" />
      <ellipse cx="58" cy="50" rx="16" ry="13" fill={mid} opacity="0.78" />
      <ellipse cx="40" cy="43" rx="16" ry="13" fill={base} opacity="0.75" />
      <ellipse cx="40" cy="82" rx="22" ry="8" fill={dark} opacity="0.4" />
    </svg>
  );
}

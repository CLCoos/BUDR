import React from 'react';

type Props = { stage: 0 | 1 | 2 | 3 | 4; accent?: string };

export default function TreePlant({ stage, accent = '#1D9E75' }: Props) {
  const trunk = `${accent}99`;
  const leaf1 = accent;
  const leaf2 = `${accent}cc`;

  // Stage 0: tiny seedling
  if (stage === 0) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="38" y="70" width="4" height="18" rx="2" fill={trunk} />
      <ellipse cx="40" cy="68" rx="8" ry="7" fill={leaf1} opacity="0.9" />
    </svg>
  );

  // Stage 1: sapling
  if (stage === 1) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="37" y="58" width="6" height="28" rx="3" fill={trunk} />
      <ellipse cx="40" cy="55" rx="14" ry="12" fill={leaf1} opacity="0.9" />
      <ellipse cx="30" cy="62" rx="9" ry="8" fill={leaf2} opacity="0.85" />
      <ellipse cx="50" cy="62" rx="9" ry="8" fill={leaf2} opacity="0.85" />
    </svg>
  );

  // Stage 2: young tree
  if (stage === 2) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="36" y="50" width="8" height="36" rx="4" fill={trunk} />
      <ellipse cx="40" cy="45" rx="20" ry="17" fill={leaf1} opacity="0.9" />
      <ellipse cx="25" cy="54" rx="13" ry="11" fill={leaf2} opacity="0.85" />
      <ellipse cx="55" cy="54" rx="13" ry="11" fill={leaf2} opacity="0.85" />
      <ellipse cx="40" cy="62" rx="15" ry="10" fill={leaf1} opacity="0.7" />
    </svg>
  );

  // Stage 3: mature tree
  if (stage === 3) return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="35" y="42" width="10" height="44" rx="5" fill={trunk} />
      <ellipse cx="40" cy="35" rx="26" ry="22" fill={leaf1} opacity="0.9" />
      <ellipse cx="20" cy="46" rx="17" ry="14" fill={leaf2} opacity="0.85" />
      <ellipse cx="60" cy="46" rx="17" ry="14" fill={leaf2} opacity="0.85" />
      <ellipse cx="40" cy="55" rx="20" ry="13" fill={leaf1} opacity="0.75" />
      <ellipse cx="30" cy="62" rx="10" ry="8" fill={leaf2} opacity="0.6" />
      <ellipse cx="50" cy="62" rx="10" ry="8" fill={leaf2} opacity="0.6" />
    </svg>
  );

  // Stage 4: full tree
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="34" y="38" width="12" height="48" rx="6" fill={trunk} />
      <ellipse cx="40" cy="28" rx="30" ry="26" fill={leaf1} opacity="0.9" />
      <ellipse cx="16" cy="42" rx="19" ry="16" fill={leaf2} opacity="0.85" />
      <ellipse cx="64" cy="42" rx="19" ry="16" fill={leaf2} opacity="0.85" />
      <ellipse cx="40" cy="50" rx="24" ry="16" fill={leaf1} opacity="0.8" />
      <ellipse cx="24" cy="60" rx="13" ry="10" fill={leaf2} opacity="0.65" />
      <ellipse cx="56" cy="60" rx="13" ry="10" fill={leaf2} opacity="0.65" />
      <ellipse cx="40" cy="65" rx="16" ry="10" fill={leaf1} opacity="0.55" />
    </svg>
  );
}

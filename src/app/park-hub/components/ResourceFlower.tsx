'use client';
import React, { useState } from 'react';
import { toast } from 'sonner';

interface Petal {
  id: string;
  label: string;
  emoji: string;
  score: number;
}

const initialPetals: Petal[] = [
  { id: 'petal-krop', label: 'Krop', emoji: '🏃', score: 3 },
  { id: 'petal-familie', label: 'Familie', emoji: '👨‍👩‍👧', score: 4 },
  { id: 'petal-venner', label: 'Venner', emoji: '👫', score: 2 },
  { id: 'petal-fritid', label: 'Fritid', emoji: '🎨', score: 4 },
  { id: 'petal-arbejde', label: 'Arbejde/Skole', emoji: '📚', score: 1 },
  { id: 'petal-oekonomi', label: 'Økonomi', emoji: '💰', score: 2 },
  { id: 'petal-bolig', label: 'Bolig', emoji: '🏠', score: 5 },
  { id: 'petal-andet', label: 'Andet', emoji: '⭐', score: 3 },
];

const petalColors = [
  '#7F77DD', '#A78BFA', '#C084FC', '#E879F9',
  '#F472B6', '#FB923C', '#FBBF24', '#34D399',
];

export default function ResourceFlower() {
  const [petals, setPetals] = useState<Petal[]>(initialPetals);
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setScore = (id: string, score: number) => {
    setPetals(prev => prev.map(p => p.id === id ? { ...p, score } : p));
  };

  const handleSave = () => {
    setSaved(true);
    // Backend: UPSERT park_resource_profile SET petal scores WHERE user_id
    toast.success('Ressourceblomst gemt 🌸');
    setTimeout(() => setSaved(false), 3000);
  };

  const selectedPetal = petals.find(p => p.id === selected);

  // SVG flower layout - 8 petals arranged in circle
  const cx = 140;
  const cy = 140;
  const centerR = 22;
  const petalDist = 62;

  const petalAngles = petals.map((_, i) => (i * 360) / 8 - 90);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-5 border border-gray-100">
        <div className="text-sm font-semibold text-gray-700 mb-1">Ressourceblomst</div>
        <div className="text-xs text-gray-500 mb-4">Tryk på et kronblad for at vurdere dine ressourcer (1–5)</div>

        {/* SVG Flower */}
        <div className="flex justify-center">
          <svg width="280" height="280" viewBox="0 0 280 280">
            {petals.map((petal, i) => {
              const angle = petalAngles[i];
              const rad = (angle * Math.PI) / 180;
              const px = cx + petalDist * Math.cos(rad);
              const py = cy + petalDist * Math.sin(rad);
              const fillRatio = petal.score / 5;
              const petalRx = 18;
              const petalRy = 28;
              const isSelected = selected === petal.id;

              return (
                <g key={petal.id} onClick={() => setSelected(isSelected ? null : petal.id)} style={{ cursor: 'pointer' }}>
                  {/* Petal background */}
                  <ellipse
                    cx={px}
                    cy={py}
                    rx={petalRx}
                    ry={petalRy}
                    fill={`${petalColors[i]}20`}
                    stroke={petalColors[i]}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    transform={`rotate(${angle + 90}, ${px}, ${py})`}
                  />
                  {/* Petal fill based on score */}
                  <ellipse
                    cx={px}
                    cy={py}
                    rx={petalRx * fillRatio}
                    ry={petalRy * fillRatio}
                    fill={petalColors[i]}
                    opacity={0.7}
                    transform={`rotate(${angle + 90}, ${px}, ${py})`}
                  />
                  {/* Emoji */}
                  <text
                    x={px}
                    y={py + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={12}
                  >
                    {petal.emoji}
                  </text>
                  {/* Label */}
                  <text
                    x={cx + (petalDist + 36) * Math.cos(rad)}
                    y={cy + (petalDist + 36) * Math.sin(rad)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={8}
                    fill="#6B7280"
                    fontFamily="DM Sans, sans-serif"
                  >
                    {petal.label}
                  </text>
                </g>
              );
            })}

            {/* Center circle */}
            <circle cx={cx} cy={cy} r={centerR} fill="#7F77DD" />
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={16}>🌸</text>
          </svg>
        </div>

        {/* Selected petal scorer */}
        {selectedPetal && (
          <div className="mt-3 bg-[#F5F4FF] rounded-lg p-4 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{selectedPetal.emoji}</span>
              <div>
                <div className="text-sm font-semibold text-gray-800">{selectedPetal.label}</div>
                <div className="text-xs text-gray-500">Score: {selectedPetal.score}/5</div>
              </div>
            </div>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button
                  key={`score-${selectedPetal.id}-${n}`}
                  onClick={() => setScore(selectedPetal.id, n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedPetal.score === n
                      ? 'bg-[#7F77DD] text-white'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-[#7F77DD]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {petals.map((p, i) => (
            <div key={`summary-${p.id}`} className="text-center">
              <div className="text-xs mb-1">{p.emoji}</div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(p.score / 5) * 100}%`, backgroundColor: petalColors[i] }}
                />
              </div>
              <div className="text-xs font-bold tabular-nums mt-0.5" style={{ color: petalColors[i] }}>{p.score}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3.5 rounded-lg font-semibold text-white text-sm transition-all active:scale-95"
        style={{ backgroundColor: '#7F77DD' }}
      >
        {saved ? '✓ Gemt!' : 'Gem ressourceblomst'}
      </button>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import StickyPrimaryFooter from '@/components/StickyPrimaryFooter';
import { CheckInData } from './MorningCheckInFlow';

interface Props {
  data: CheckInData;
  setData: React.Dispatch<React.SetStateAction<CheckInData>>;
  onNext: () => void;
}

const moods = [
  { id: 'glad', label: 'Glad', emoji: '😊', accent: '#FCD34D' },
  { id: 'rolig', label: 'Rolig', emoji: '😌', accent: '#34D399' },
  { id: 'urolig', label: 'Urolig', emoji: '😟', accent: '#FB923C' },
  { id: 'træt', label: 'Træt', emoji: '😴', accent: '#60A5FA' },
  { id: 'trist', label: 'Trist', emoji: '😢', accent: '#818CF8' },
  { id: 'overvældet', label: 'Overvældet', emoji: '🤯', accent: '#A78BFA' },
];

const companionResponses: Record<string, string> = {
  glad: 'Det er vidunderligt! Lad os udnytte den gode energi 🌟',
  rolig: 'Ro er styrke. Det er en god tilstand at starte dagen fra 🍃',
  urolig: 'Det er okay at føle sig urolig. Vi tager det ét skridt ad gangen 🤝',
  træt: 'Vi tager det roligt i dag og prioriterer hvile 💙',
  trist: 'Det er okay at have en trist dag. Du er ikke alene 💛',
  overvældet: 'Lad os dele dagen op i meget små bidder — ét ad gangen 🧩',
};

export default function CheckInStepMood({ data, setData, onNext }: Props) {
  const [error, setError] = useState('');
  const selected = moods.find((m) => m.id === data.mood);

  const handleSelect = (id: string) => {
    setError('');
    setData((d) => ({ ...d, mood: id }));
  };

  const handleNext = () => {
    if (!data.mood) { setError('Vælg dit humør for at fortsætte'); return; }
    onNext();
  };

  return (
    <div className="max-w-lg mx-auto px-4 pb-12">
      <div className="mb-5 pt-2">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-midnight-50 mb-2">Hvad føler du lige nu? 💭</h2>
        <p className="text-midnight-400 text-sm">Vælg det ord der passer bedst til din følelse.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {moods.map((mood) => {
          const isSelected = data.mood === mood.id;
          return (
            <button
              key={`mood-${mood.id}`}
              onClick={() => handleSelect(mood.id)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer active:scale-95 min-h-[76px]"
              style={{
                borderColor: isSelected ? mood.accent : 'rgba(255,255,255,0.08)',
                background: isSelected ? `${mood.accent}18` : 'rgba(255,255,255,0.03)',
              }}
              aria-pressed={isSelected}
            >
              <span className="text-2xl mb-1 select-none">{mood.emoji}</span>
              <span className="text-sm font-semibold text-midnight-100">{mood.label}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="bg-midnight-800/60 rounded-2xl border border-midnight-600/50 p-3.5 mb-4 flex items-start gap-3 animate-slide-up">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${selected.accent}20` }}>
            <span className="text-lg">💜</span>
          </div>
          <div>
            <p className="text-xs text-midnight-400 font-medium mb-1">Lys siger:</p>
            <p className="text-sm text-midnight-100 font-medium leading-relaxed">{companionResponses[selected.id]}</p>
          </div>
        </div>
      )}

      {error && <p className="text-rose-400 text-sm font-medium text-center mb-4">{error}</p>}
      <StickyPrimaryFooter>
        <button type="button" onClick={handleNext} className="btn-primary w-full text-base py-3.5 min-h-[48px]">
          Næste →
        </button>
      </StickyPrimaryFooter>
    </div>
  );
}
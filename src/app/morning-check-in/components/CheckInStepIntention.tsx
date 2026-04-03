'use client';

import React, { useState } from 'react';
import StickyPrimaryFooter from '@/components/StickyPrimaryFooter';
import { CheckInData } from './MorningCheckInFlow';

interface Props {
  data: CheckInData;
  setData: React.Dispatch<React.SetStateAction<CheckInData>>;
  onNext: () => void;
}

const intentionSuggestions = [
  { id: 'int-rolig', text: 'Tage det roligt og lytte til min krop', emoji: '🧘' },
  { id: 'int-opgaver', text: 'Gennemføre mine vigtigste opgaver', emoji: '✅' },
  { id: 'int-positiv', text: 'Holde fokus på det positive', emoji: '☀️' },
  { id: 'int-social', text: 'Sige hej til én person i dag', emoji: '👋' },
  { id: 'int-bevæg', text: 'Komme ud og bevæge mig lidt', emoji: '🚶' },
  { id: 'int-mad', text: 'Huske at spise og drikke nok', emoji: '🍎' },
];

export default function CheckInStepIntention({ data, setData, onNext }: Props) {
  const [customIntention, setCustomIntention] = useState('');
  const [error, setError] = useState('');

  const handleSelect = (text: string) => {
    setError('');
    setData((d) => ({ ...d, intention: text }));
    setCustomIntention('');
  };

  const handleCustomChange = (val: string) => {
    setCustomIntention(val);
    setData((d) => ({ ...d, intention: val }));
    if (error) setError('');
  };

  const handleNext = () => {
    const intent = data.intention.trim() || customIntention.trim();
    if (!intent) {
      setError('Sæt en intention for din dag for at fortsætte');
      return;
    }
    setData((d) => ({ ...d, intention: intent }));
    onNext();
  };

  return (
    <div className="max-w-lg mx-auto px-4 pb-28">
      <div className="mb-5 pt-2">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-midnight-50 mb-2">
          Sæt en intention 🌱
        </h2>
        <p className="text-midnight-400 text-sm leading-relaxed">
          Vælg <strong className="text-midnight-200">ét fokus</strong> for din dag.
        </p>
      </div>

      <div className="space-y-2 mb-4">
        {intentionSuggestions.map((suggestion) => {
          const isSelected = data.intention === suggestion.text;
          return (
            <button
              key={suggestion.id}
              onClick={() => handleSelect(suggestion.text)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer active:scale-[0.99] min-h-[52px]"
              style={{
                borderColor: isSelected ? '#34D399' : 'rgba(255,255,255,0.08)',
                background: isSelected ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)',
              }}
              aria-pressed={isSelected}
            >
              <span className="text-xl select-none">{suggestion.emoji}</span>
              <span
                className={`text-sm font-medium flex-1 leading-snug ${isSelected ? 'text-emerald-300 font-semibold' : 'text-midnight-200'}`}
              >
                {suggestion.text}
              </span>
              {isSelected && (
                <div className="w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="#0f0f1a"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-midnight-800/60 rounded-2xl border-2 border-dashed border-midnight-600 p-3.5 mb-4">
        <label
          htmlFor="custom-intention"
          className="block text-xs font-semibold text-midnight-400 mb-2"
        >
          Skriv din egen intention
        </label>
        <textarea
          id="custom-intention"
          value={customIntention}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="I dag vil jeg..."
          rows={2}
          className="w-full rounded-xl border border-midnight-600 px-3 py-2.5 text-sm bg-midnight-900 text-midnight-100 outline-none focus:border-sunrise-400 transition-colors placeholder-midnight-600 resize-none"
        />
      </div>

      {(data.intention || customIntention) && (
        <div className="bg-midnight-800/60 rounded-2xl border border-emerald-500/20 p-3.5 mb-4 animate-slide-up">
          <p className="text-xs text-emerald-400 font-semibold mb-1">Din intention for i dag:</p>
          <p className="text-sm text-midnight-100 font-medium leading-relaxed italic">
            &ldquo;{data.intention || customIntention}&rdquo;
          </p>
        </div>
      )}

      {error && <p className="text-rose-400 text-sm font-medium text-center mb-4">{error}</p>}
      <StickyPrimaryFooter>
        <button
          type="button"
          onClick={handleNext}
          className="btn-primary w-full text-base py-3.5 min-h-[48px]"
        >
          Fortsæt →
        </button>
      </StickyPrimaryFooter>
    </div>
  );
}

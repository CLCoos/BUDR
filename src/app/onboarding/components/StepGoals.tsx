'use client';

import React, { useState } from 'react';
import StickyPrimaryFooter from '@/components/StickyPrimaryFooter';
import { OnboardingData } from './OnboardingFlow';

interface StepProps {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
}

type GoalCategory = 'krop' | 'sind' | 'sociale';

const categories: {
  id: GoalCategory;
  label: string;
  emoji: string;
  lead: string;
  hint: string;
}[] = [
  {
    id: 'krop',
    label: 'Krop',
    emoji: '💪',
    lead: 'Krop og basale vaner',
    hint: 'Alt der holder kroppen kørende: søvn, mad, medicin, små bevægelser.',
  },
  {
    id: 'sind',
    label: 'Sind',
    emoji: '🧠',
    lead: 'Sind og overskud',
    hint: 'Ro, overblik, humør og det der giver mening — uden pres.',
  },
  {
    id: 'sociale',
    label: 'Sociale',
    emoji: '🤝',
    lead: 'Mennesker omkring dig',
    hint: 'Kontakt og fællesskab i det tempo, der passer dig.',
  },
];

const presetGoals: { id: string; label: string; emoji: string; category: GoalCategory }[] = [
  { id: 'goal-morgenrutine', label: 'Kom godt i gang om morgenen', emoji: '🌅', category: 'krop' },
  { id: 'goal-mad', label: 'Spise og drikke regelmæssigt', emoji: '🍽️', category: 'krop' },
  { id: 'goal-bevæg', label: 'Lidt bevægelse hver dag', emoji: '🚶', category: 'krop' },
  { id: 'goal-søvn', label: 'Søvn der passer til mig', emoji: '🌙', category: 'krop' },
  { id: 'goal-medicin', label: 'Huske medicin og aftaler', emoji: '💊', category: 'krop' },
  { id: 'goal-ro', label: 'Finde ro i løbet af dagen', emoji: '🧘', category: 'sind' },
  { id: 'goal-opgaver', label: 'Overblik over dagens opgaver', emoji: '✅', category: 'sind' },
  { id: 'goal-humør', label: 'Mærke efter hvordan jeg har det', emoji: '😊', category: 'sind' },
  {
    id: 'goal-kreativ',
    label: 'Gøre noget kreativt eller hyggeligt',
    emoji: '🎨',
    category: 'sind',
  },
  {
    id: 'goal-social',
    label: 'Holde kontakt med nogen jeg kender',
    emoji: '💬',
    category: 'sociale',
  },
  {
    id: 'goal-hjælp',
    label: 'Turde spørge om hjælp eller selskab',
    emoji: '🫂',
    category: 'sociale',
  },
];

const MAX_GOALS = 5;

export default function StepGoals({ data, setData, onNext }: StepProps) {
  const [customGoal, setCustomGoal] = useState('');
  const [error, setError] = useState('');
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  const toggleGoal = (id: string) => {
    setError('');
    setData((d) => {
      const already = d.goals.includes(id);
      if (already) return { ...d, goals: d.goals.filter((g) => g !== id) };
      if (d.goals.length >= MAX_GOALS) return d;
      return { ...d, goals: [...d.goals, id] };
    });
  };

  const addCustomGoal = () => {
    const trimmed = customGoal.trim();
    if (!trimmed) return;
    const customId = `custom-${trimmed.toLowerCase().replace(/\s+/g, '-')}`;
    if (!data.goals.includes(customId) && data.goals.length < MAX_GOALS) {
      setData((d) => ({ ...d, goals: [...d.goals, customId] }));
      setCustomGoal('');
    }
  };

  const handleNext = () => {
    if (data.goals.length === 0) {
      setError('Vælg mindst ét mål for at fortsætte');
      return;
    }
    onNext();
  };

  const currentCat = categories[activeCategoryIndex];
  const visibleGoals = presetGoals.filter((g) => g.category === currentCat.id);

  return (
    <div className="max-w-lg mx-auto px-4 pb-28">
      <div className="mb-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-midnight-50 mb-1.5">
          Hvad er dine mål? 🎯
        </h2>
        <p className="text-midnight-400 text-sm leading-relaxed">
          Tryk på <strong className="text-midnight-200">Krop</strong>,{' '}
          <strong className="text-midnight-200">Sind</strong> eller{' '}
          <strong className="text-midnight-200">Sociale</strong> — vælg forslag herunder. Du kan
          blande på tværs af fanerne og vælge op til {MAX_GOALS} mål i alt.
        </p>
      </div>

      <div className="flex items-center gap-1.5 mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={`goal-dot-${n}`}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              n <= data.goals.length ? 'bg-aurora-teal' : 'bg-midnight-700'
            }`}
          />
        ))}
        <span className="text-xs text-midnight-400 font-medium ml-1 whitespace-nowrap">
          {data.goals.length}/{MAX_GOALS}
        </span>
      </div>

      {/* Category tabs — en ad gangen, ingen vandret scroll */}
      <div className="flex gap-1.5 mb-3" role="tablist" aria-label="Målkategorier">
        {categories.map((c, i) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={activeCategoryIndex === i}
            onClick={() => setActiveCategoryIndex(i)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 min-h-[48px] border ${
              activeCategoryIndex === i
                ? 'bg-aurora-teal/15 border-aurora-teal/50 text-aurora-teal'
                : 'bg-midnight-800/60 border-midnight-600 text-midnight-400 hover:text-midnight-200'
            }`}
          >
            <span className="mr-0.5">{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      <div
        className="rounded-2xl border border-midnight-600/60 bg-midnight-800/40 px-3 py-3 mb-3"
        role="tabpanel"
      >
        <p className="text-sm font-semibold text-midnight-100">
          {currentCat.emoji} {currentCat.lead}
        </p>
        <p className="text-xs text-midnight-500 mt-1 leading-relaxed">{currentCat.hint}</p>
      </div>

      {/* Ét panel ad gangen — ingen overflow-x, ingen synlig vandret scrollbar */}
      <div className="space-y-2 mb-4">
        {visibleGoals.map((goal) => {
          const isSelected = data.goals.includes(goal.id);
          const isDisabled = !isSelected && data.goals.length >= MAX_GOALS;

          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => toggleGoal(goal.id)}
              disabled={isDisabled}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left
                transition-all duration-200 cursor-pointer min-h-[52px]
                ${
                  isSelected
                    ? 'border-aurora-teal bg-aurora-teal/10 shadow-sm ring-1 ring-aurora-teal/30'
                    : isDisabled
                      ? 'border-midnight-700 bg-midnight-800/50 opacity-40 cursor-not-allowed'
                      : 'border-midnight-600 bg-midnight-800 hover:border-midnight-500 hover:shadow-sm active:scale-[0.99]'
                }
              `}
              aria-pressed={isSelected}
            >
              <span className="text-xl select-none">{goal.emoji}</span>
              <span
                className={`font-medium text-sm flex-1 leading-snug ${
                  isSelected ? 'text-aurora-teal' : 'text-midnight-200'
                }`}
              >
                {goal.label}
              </span>
              {isSelected && (
                <div className="w-5 h-5 bg-aurora-teal rounded-full flex items-center justify-center flex-shrink-0">
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

      <div className="bg-midnight-800 rounded-2xl border-2 border-dashed border-sunrise-400/30 p-3.5 mb-4">
        <p className="text-xs font-semibold text-midnight-400 mb-2 font-display">
          Tilføj dit eget mål
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomGoal()}
            placeholder="Skriv dit mål her..."
            className="flex-1 rounded-xl border border-midnight-600 px-3 py-2.5 text-sm bg-midnight-900 text-midnight-100 outline-none focus:border-sunrise-400 transition-colors placeholder-midnight-600 min-h-[44px]"
            disabled={data.goals.length >= MAX_GOALS}
          />
          <button
            type="button"
            onClick={addCustomGoal}
            disabled={!customGoal.trim() || data.goals.length >= MAX_GOALS}
            className="bg-sunrise-400 text-midnight-900 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sunrise-500 active:scale-95 transition-all min-h-[44px] min-w-[72px]"
          >
            Tilføj
          </button>
        </div>
      </div>

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

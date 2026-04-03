'use client';

import React, { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import CompanionAvatar from '@/components/CompanionAvatar';
import { CompanionReaction } from '@/components/CompanionAvatar';
import { Moon, Sparkles, Leaf } from 'lucide-react';

const restActivities = [
  {
    id: 'a1',
    emoji: '☕',
    label: 'En varm drik',
    description: 'Te, kakao eller kaffe',
    color: '#FB923C',
    bg: 'rgba(251,146,60,0.12)',
  },
  {
    id: 'a2',
    emoji: '🎵',
    label: 'Blid musik',
    description: 'Lyt til noget du elsker',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.12)',
  },
  {
    id: 'a3',
    emoji: '📖',
    label: 'Læs lidt',
    description: 'Ingen krav — bare nyd det',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.12)',
  },
  {
    id: 'a4',
    emoji: '🌿',
    label: 'Frisk luft',
    description: 'Åbn et vindue eller gå ud',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.12)',
  },
  {
    id: 'a5',
    emoji: '🛁',
    label: 'Bad eller brusebad',
    description: 'Varm og blød',
    color: '#F472B6',
    bg: 'rgba(244,114,182,0.12)',
  },
  {
    id: 'a6',
    emoji: '😴',
    label: 'Hvil dig',
    description: 'Luk øjnene og slap af',
    color: '#818CF8',
    bg: 'rgba(129,140,248,0.12)',
  },
];

const companionMessages: Record<string, string[]> = {
  bjorn: [
    'I dag er din dag til at hvile. Det er ikke dovenskab — det er kærlighed til dig selv. 🐻🌿',
    'Hvile er en del af helbredelsen. Du gør det rigtige. 🤎',
    'Ingen opgaver i dag. Bare vær. Jeg er her. 🐾',
  ],
  ræv: [
    'Selv den klogeste ræv hviler sig. Du er i gode hænder. 🦊🍂',
    'Hvile giver energi til i morgen. Du er klog nok til at vide det. ✨',
    'I dag er en hviledag — og det er perfekt. 💡',
  ],
  ugle: [
    'Visdommen ligger i at kende sine grænser. Hvil dig, du fortjener det. 🦉🌙',
    'Hvile er ikke at give op — det er at samle kræfter. ⭐',
    'Jeg holder øje med dig. Slap af. 💜',
  ],
  pingvin: [
    'Selv pingviner hviler sig! I dag er din tur. 🐧❄️',
    'Ingen dans i dag — bare hvile og hygge. 💙',
    'Du er fantastisk, uanset om du gør noget eller ej! ✨',
  ],
  hund: [
    'Jeg er her hos dig hele dagen! Vi hviler os sammen. 🐶💛',
    'Hviledag er den bedste dag! Jeg elsker dig! ❤️',
    'Ingen pres — bare kærlighed og hvile. 🐾',
  ],
  kat: [
    'Katte hviler sig hele dagen — og det er perfekt. 🐱🌸',
    'Stille og roligt... det er den rigtige måde. 💗',
    'I dag er din dag. Gør præcis hvad du har lyst til. 🌺',
  ],
};

export default function HviledagView() {
  const [companion, setCompanion] = useState('bjorn');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [reaction, setReaction] = useState<CompanionReaction>('idle');
  const [messageIndex, setMessageIndex] = useState(0);
  const [restDayConfirmed, setRestDayConfirmed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('budr_companion');
    if (saved) setCompanion(saved);
  }, []);

  useEffect(() => {
    if (restDayConfirmed) {
      setReaction('celebrate');
      const t = setTimeout(() => setReaction('idle'), 3000);
      return () => clearTimeout(t);
    }
  }, [restDayConfirmed]);

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
    setReaction('taskComplete');
    setTimeout(() => setReaction('idle'), 2500);
  };

  const messages = companionMessages[companion] || companionMessages['bjorn'];
  const currentMessage = messages[messageIndex % messages.length];

  const cycleMessage = () => {
    setMessageIndex((i) => i + 1);
    setReaction('moodChange');
    setTimeout(() => setReaction('idle'), 2500);
  };

  return (
    <div className="min-h-screen bg-midnight-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-midnight-900/95 backdrop-blur-xl border-b border-midnight-700/40 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-aurora-violet/15 border border-aurora-violet/30 flex items-center justify-center">
            <Moon size={18} className="text-purple-300" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base text-midnight-50">Hviledag</h1>
            <p className="text-xs text-midnight-400">Ingen pres — bare vær</p>
          </div>
          <div className="ml-auto">
            <CompanionAvatar
              companion={companion}
              size="sm"
              mood="sleepy"
              reaction={reaction}
              onReactionEnd={() => setReaction('idle')}
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Hero companion card */}
        <div className="rounded-2xl bg-gradient-to-br from-aurora-violet/15 to-midnight-800/60 border border-aurora-violet/25 p-5 flex flex-col items-center text-center">
          <CompanionAvatar
            companion={companion}
            size="lg"
            mood="sleepy"
            animate
            reaction={reaction}
            onReactionEnd={() => setReaction('idle')}
          />
          <button
            type="button"
            onClick={cycleMessage}
            className="mt-4 w-full max-w-sm text-sm text-midnight-100 leading-relaxed text-center hover:text-white transition-colors cursor-pointer min-h-[48px] py-3 px-2 rounded-xl"
          >
            {currentMessage}
          </button>
          <p className="text-[10px] text-midnight-500 mt-2">Tryk for en ny besked</p>
        </div>

        {/* Rest day confirmation */}
        {!restDayConfirmed ? (
          <div className="rounded-2xl bg-midnight-800/60 border border-midnight-700/40 p-4 text-center">
            <p className="text-sm text-midnight-200 mb-4 leading-relaxed">
              I dag er en hviledag. Du behøver ikke gøre noget. Ingen opgaver, ingen krav — bare
              hvile.
            </p>
            <button
              type="button"
              onClick={() => setRestDayConfirmed(true)}
              className="w-full max-w-sm mx-auto px-6 py-3.5 rounded-xl font-semibold text-sm bg-aurora-violet/20 border border-aurora-violet/40 text-purple-300 transition-all duration-200 active:scale-95 hover:bg-aurora-violet/30 min-h-[48px]"
            >
              🌙 Jeg tager en hviledag i dag
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-aurora-violet/10 border border-aurora-violet/30 p-4 flex items-center gap-3">
            <span className="text-2xl">🌙</span>
            <div>
              <p className="text-sm font-semibold text-purple-300">Hviledag aktiveret</p>
              <p className="text-xs text-midnight-400">Ingen opgaver i dag — du fortjener det</p>
            </div>
            <span className="ml-auto text-green-400 text-lg">✓</span>
          </div>
        )}

        {/* Gentle activities */}
        <div className="rounded-2xl bg-midnight-800/60 border border-midnight-700/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} className="text-sunrise-400" />
            <h2 className="font-display font-bold text-sm text-midnight-100">Blide aktiviteter</h2>
            <span className="ml-auto text-xs text-midnight-500">Valgfrit</span>
          </div>
          <p className="text-xs text-midnight-400 mb-3">
            Ingen krav — vælg noget hvis du har lyst, eller bare hvil dig.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {restActivities.map((activity) => {
              const isSelected = selectedActivities.includes(activity.id);
              return (
                <button
                  type="button"
                  key={activity.id}
                  onClick={() => toggleActivity(activity.id)}
                  className="flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 active:scale-95 min-h-[44px]"
                  style={{
                    background: isSelected ? activity.bg : 'rgba(255,255,255,0.03)',
                    borderColor: isSelected ? `${activity.color}50` : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{activity.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-semibold leading-tight"
                      style={{ color: isSelected ? activity.color : '#cbd5e1' }}
                    >
                      {activity.label}
                    </p>
                    <p className="text-[10px] text-midnight-500 mt-0.5 leading-tight">
                      {activity.description}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-xs flex-shrink-0" style={{ color: activity.color }}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Affirmation */}
        <div className="rounded-2xl bg-gradient-to-br from-midnight-800/60 to-aurora-violet/8 border border-midnight-700/30 p-4 text-center">
          <p className="text-xs text-midnight-400 mb-2">💜 Dagens påmindelse</p>
          <p className="text-sm text-midnight-200 leading-relaxed italic">
            «Hvile er ikke en belønning for hårdt arbejde — det er en nødvendighed for at leve
            godt.»
          </p>
        </div>

        {/* No pressure note */}
        <div className="rounded-2xl bg-midnight-800/40 border border-midnight-700/30 p-4 flex items-start gap-3">
          <Leaf size={16} className="text-aurora-teal mt-0.5 flex-shrink-0" />
          <p className="text-xs text-midnight-300 leading-relaxed">
            Din ledsager er her hele dagen. Du behøver ikke præstere noget. I morgen er en ny dag.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import BottomNav from '@/components/BottomNav';
import CompanionAvatar from '@/components/CompanionAvatar';
import { Phone, Heart, Wind, ChevronDown, ChevronUp } from 'lucide-react';

const crisisNumbers = [
  {
    name: 'Livslinien',
    number: '70 201 201',
    description: 'Gratis rådgivning — døgnet rundt',
    emoji: '🌱',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.12)',
  },
  {
    name: 'Børns Vilkår — BørneTelefonen',
    number: '116 111',
    description: 'For børn og unge under 18 år',
    emoji: '🌸',
    color: '#F472B6',
    bg: 'rgba(244,114,182,0.12)',
  },
  {
    name: 'Selvmordslinien',
    number: '70 201 201',
    description: 'Akut hjælp ved selvmordstanker',
    emoji: '💙',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.12)',
  },
  {
    name: 'Alarmcentralen',
    number: '112',
    description: 'Akut fare for liv',
    emoji: '🚨',
    color: '#FB923C',
    bg: 'rgba(251,146,60,0.12)',
  },
  {
    name: 'Psykiatrisk Skadestue',
    number: '1813',
    description: 'Akut psykisk krise — ring til lægevagten',
    emoji: '🏥',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.12)',
  },
];

const breathingPhases = [
  { label: 'Træk vejret ind', duration: 4, color: '#60A5FA', scale: 1.4 },
  { label: 'Hold vejret', duration: 4, color: '#A78BFA', scale: 1.4 },
  { label: 'Pust langsomt ud', duration: 6, color: '#34D399', scale: 1.0 },
  { label: 'Hold vejret', duration: 2, color: '#FB923C', scale: 1.0 },
];

const quickContacts = [
  { name: 'Mor', emoji: '👩', color: '#FB923C', bg: 'rgba(251,146,60,0.15)' },
  { name: 'Bedste ven', emoji: '🧑', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' },
  { name: 'Terapeut', emoji: '🩺', color: '#34D399', bg: 'rgba(52,211,153,0.15)' },
  { name: 'Søster', emoji: '👧', color: '#F472B6', bg: 'rgba(244,114,182,0.15)' },
];

export default function KriseView() {
  const [companion, setCompanion] = useState('bjorn');
  const [breathingActive, setBreathingActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [showNumbers, setShowNumbers] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem('budr_companion');
    if (saved) setCompanion(saved);
  }, []);

  useEffect(() => {
    if (!breathingActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPhaseIndex(0);
      setPhaseProgress(0);
      tickRef.current = 0;
      return;
    }

    let currentPhase = 0;
    let currentTick = 0;

    intervalRef.current = setInterval(() => {
      const phase = breathingPhases[currentPhase];
      currentTick++;
      const progress = currentTick / phase.duration;
      setPhaseProgress(Math.min(progress, 1));

      if (currentTick >= phase.duration) {
        currentTick = 0;
        currentPhase = (currentPhase + 1) % breathingPhases.length;
        setPhaseIndex(currentPhase);
        if (currentPhase === 0) setCycleCount((c) => c + 1);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [breathingActive]);

  const currentPhase = breathingPhases[phaseIndex];
  const circleScale = breathingActive
    ? phaseIndex === 0
      ? 1 + phaseProgress * 0.4
      : phaseIndex === 1
        ? 1.4
        : phaseIndex === 2
          ? 1.4 - phaseProgress * 0.4
          : 1.0
    : 1.0;

  return (
    <div className="min-h-screen bg-midnight-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-midnight-900/95 backdrop-blur-xl border-b border-midnight-700/40 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-aurora-blue/15 border border-aurora-blue/30 flex items-center justify-center">
            <Heart size={18} className="text-blue-300" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base text-midnight-50">Krise & Støtte</h1>
            <p className="text-xs text-midnight-400">Du er ikke alene</p>
          </div>
          <div className="ml-auto">
            <CompanionAvatar companion={companion} size="sm" mood="happy" />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Companion message */}
        <div className="rounded-2xl bg-midnight-800/60 border border-midnight-700/40 p-4 flex items-start gap-3">
          <CompanionAvatar companion={companion} size="sm" mood="happy" />
          <div className="flex-1">
            <p className="text-sm text-midnight-100 leading-relaxed">
              Jeg er her hos dig. Det kræver mod at søge hjælp — og det er det rigtige at gøre. 💙
            </p>
            <p className="text-xs text-midnight-400 mt-1">Din ledsager</p>
          </div>
        </div>

        {/* Breathing Exercise */}
        <div className="rounded-2xl bg-midnight-800/60 border border-midnight-700/40 overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center gap-2">
            <Wind size={16} className="text-aurora-teal" />
            <h2 className="font-display font-bold text-sm text-midnight-100">Åndedrætsøvelse</h2>
            <span className="ml-auto text-xs text-midnight-400">4-4-6-2 teknik</span>
          </div>

          <div className="flex flex-col items-center py-6 px-4">
            {/* Breathing circle */}
            <div
              className="relative flex items-center justify-center mb-6"
              style={{ width: 180, height: 180 }}
            >
              {/* Outer glow ring */}
              <div
                className="absolute rounded-full transition-all duration-1000"
                style={{
                  width: 160,
                  height: 160,
                  background: `radial-gradient(circle, ${currentPhase.color}15 0%, transparent 70%)`,
                  transform: `scale(${circleScale})`,
                  boxShadow: breathingActive ? `0 0 40px ${currentPhase.color}30` : 'none',
                }}
              />
              {/* Main circle */}
              <div
                className="absolute rounded-full border-2 transition-all duration-1000 flex items-center justify-center"
                style={{
                  width: 120,
                  height: 120,
                  borderColor: currentPhase.color,
                  background: `${currentPhase.color}10`,
                  transform: `scale(${circleScale})`,
                  boxShadow: breathingActive ? `0 0 24px ${currentPhase.color}40` : 'none',
                }}
              >
                <span className="text-3xl select-none">
                  {breathingActive
                    ? phaseIndex === 2
                      ? '💨'
                      : phaseIndex === 0
                        ? '🌬️'
                        : '✨'
                    : '🌬️'}
                </span>
              </div>
            </div>

            {/* Phase label */}
            <div className="text-center mb-4 min-h-[40px]">
              {breathingActive ? (
                <>
                  <p
                    className="font-display font-bold text-base"
                    style={{ color: currentPhase.color }}
                  >
                    {currentPhase.label}
                  </p>
                  <p className="text-xs text-midnight-400 mt-0.5">
                    {currentPhase.duration} sekunder
                    {cycleCount > 0 &&
                      ` · ${cycleCount} ${cycleCount === 1 ? 'runde' : 'runder'} gennemført`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-midnight-400">Tryk start for at begynde</p>
              )}
            </div>

            {/* Progress bar */}
            {breathingActive && (
              <div className="w-full max-w-[200px] h-1.5 bg-midnight-700 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${phaseProgress * 100}%`,
                    background: currentPhase.color,
                  }}
                />
              </div>
            )}

            <button
              onClick={() => setBreathingActive(!breathingActive)}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
              style={{
                background: breathingActive ? 'rgba(167,139,250,0.15)' : 'rgba(96,165,250,0.2)',
                color: breathingActive ? '#A78BFA' : '#60A5FA',
                border: `1px solid ${breathingActive ? 'rgba(167,139,250,0.4)' : 'rgba(96,165,250,0.4)'}`,
              }}
            >
              {breathingActive ? '⏹ Stop' : '▶ Start øvelse'}
            </button>
          </div>
        </div>

        {/* Quick contacts */}
        <div className="rounded-2xl bg-midnight-800/60 border border-midnight-700/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={16} className="text-aurora-pink" />
            <h2 className="font-display font-bold text-sm text-midnight-100">
              Ring til en du stoler på
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickContacts.map((contact) => (
              <a
                key={contact.name}
                href="tel:"
                className="flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-200 active:scale-95"
                style={{
                  background: contact.bg,
                  borderColor: `${contact.color}40`,
                }}
              >
                <span className="text-xl">{contact.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: contact.color }}>
                    {contact.name}
                  </p>
                  <p className="text-[10px] text-midnight-400">Ring nu</p>
                </div>
                <Phone size={13} style={{ color: contact.color }} />
              </a>
            ))}
          </div>
        </div>

        {/* Crisis numbers */}
        <div className="rounded-2xl bg-midnight-800/60 border border-midnight-700/40 overflow-hidden">
          <button
            onClick={() => setShowNumbers(!showNumbers)}
            className="w-full flex items-center gap-2 px-4 py-3.5 hover:bg-midnight-700/30 transition-colors"
          >
            <Phone size={16} className="text-sunrise-400" />
            <h2 className="font-display font-bold text-sm text-midnight-100 flex-1 text-left">
              Danske krisetelefoner
            </h2>
            {showNumbers ? (
              <ChevronUp size={16} className="text-midnight-400" />
            ) : (
              <ChevronDown size={16} className="text-midnight-400" />
            )}
          </button>

          {showNumbers && (
            <div className="px-4 pb-4 space-y-2">
              {crisisNumbers.map((item) => (
                <a
                  key={item.name}
                  href={`tel:${item.number.replace(/\s/g, '')}`}
                  className="flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 active:scale-[0.98]"
                  style={{ background: item.bg, borderColor: `${item.color}30` }}
                >
                  <span className="text-xl flex-shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-midnight-100 truncate">{item.name}</p>
                    <p className="text-[10px] text-midnight-400">{item.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold" style={{ color: item.color }}>
                      {item.number}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Grounding reminder */}
        <div className="rounded-2xl bg-aurora-violet/8 border border-aurora-violet/20 p-4">
          <p className="text-xs font-semibold text-purple-300 mb-2">🌿 Husk</p>
          <p className="text-sm text-midnight-200 leading-relaxed">
            Du behøver ikke klare det alene. At række ud er et tegn på styrke — ikke svaghed. Alle
            de ovenstående linjer er gratis og fortrolige.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

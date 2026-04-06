'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';

export type CompanionReaction =
  | 'taskComplete'
  | 'moodChange'
  | 'energySwing'
  | 'celebrate'
  | 'idle';

interface CompanionAvatarProps {
  companion: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  mood?: 'happy' | 'neutral' | 'excited' | 'sleepy';
  className?: string;
  clickable?: boolean;
  /** Trigger a contextual reaction externally */
  reaction?: CompanionReaction;
  /** Called after the reaction animation completes */
  onReactionEnd?: () => void;
}

const companionEmoji: Record<string, string> = {
  bjorn: '🐻',
  ræv: '🦊',
  ugle: '🦉',
  pingvin: '🐧',
  hund: '🐶',
  kat: '🐱',
};

const companionName: Record<string, string> = {
  bjorn: 'Bjørn',
  ræv: 'Ræv',
  ugle: 'Ugle',
  pingvin: 'Pingvin',
  hund: 'Hund',
  kat: 'Kat',
};

const encouragements: Record<string, string[]> = {
  bjorn: [
    'Du er stærkere end du tror! 🐻💪',
    'Tag det roligt — du klarer det! 🌿',
    'Jeg er stolt af dig, uanset hvad! 🤎',
    'Ét skridt ad gangen, vi er sammen! 🐾',
    'Du gør det godt! Bliv ved! ✨',
  ],
  ræv: [
    'Din nysgerrighed er din styrke! 🦊✨',
    'Du finder altid en vej! 🍂',
    'Klog og modig — det er dig! 🌟',
    'Jeg tror på dine idéer! 💡',
    'Du er fantastisk, ved du det? 🧡',
  ],
  ugle: [
    'Du er klogere end du tror! 🦉📚',
    'Husk: fremgang, ikke perfektion! 🌙',
    'Jeg holder øje med din vækst! ⭐',
    'Du lærer noget nyt hver dag! 🌿',
    'Vis og tålmodig — ligesom mig! 💜',
  ],
  pingvin: [
    'Hej! Du er den bedste! 🐧🎉',
    'Tid til at fejre dine fremskridt! ❄️',
    'Du spreder glæde overalt! ✨',
    'Jeg danser for dig i dag! 💙',
    'Fortsæt — det er sjovt! 🌊',
  ],
  hund: [
    'Jeg er SÅ glad for at se dig! 🐶💛',
    'Du er min favorit! Altid! 🌟',
    'Kom igen! Du kan det! 🏃',
    'Jeg vifter med halen for dig! 🐾',
    'Du gør mig stolt hver dag! ❤️',
  ],
  kat: [
    'Du er speciel, på din egen måde 🐱🌸',
    'Tag dit tempo — det er perfekt! ✨',
    'Jeg er her, stille og roligt! 💗',
    'Du er blid og stærk på én gang! 🌺',
    'Purr... du klarer det! 🌙',
  ],
};

/** Contextual reaction messages per event type */
const reactionMessages: Record<Exclude<CompanionReaction, 'idle'>, Record<string, string[]>> = {
  taskComplete: {
    bjorn: ['Ja! Opgave klaret! 🐻🎉', 'Du er uovervindelig! ⭐', 'Endnu et skridt fremad! 🐾'],
    ræv: ['Snedig og hurtig! 🦊✨', 'Klaret med stil! 🍂', 'Du er skarpt! 💡'],
    ugle: ['Fremragende! 🦉📚', 'Klogt gennemført! ⭐', 'Perfekt udført! 🌙'],
    pingvin: ['Woohoo! 🐧🎊', 'Jeg danser af glæde! ❄️', 'Fantastisk! ✨'],
    hund: ['JA JA JA! 🐶💛', 'Jeg er SÅ stolt! 🏆', 'Du er den bedste! 🐾'],
    kat: ['Purr... godt klaret 🐱✨', 'Elegant og præcist! 🌸', 'Imponerende! 💗'],
  },
  moodChange: {
    bjorn: [
      'Jeg mærker dit humør 🐻🤎',
      'Jeg er her uanset hvad! 🌿',
      'Dine følelser er vigtige 💛',
    ],
    ræv: ['Alle humører er OK! 🦊', 'Jeg forstår dig 🍂', 'Dine følelser er gyldige ✨'],
    ugle: ['Humøret svinger — det er normalt 🦉', 'Vær tålmodig med dig selv 🌙', 'Jeg ser dig 💜'],
    pingvin: ['Alle dage er forskellige! 🐧', 'Jeg er her for dig ❄️', 'Dine følelser tæller 💙'],
    hund: ['Jeg elsker dig uanset humør! 🐶', 'Jeg er altid her! ❤️', 'Du er min favorit! 💛'],
    kat: ['Stille og roligt... 🐱', 'Tag det i dit tempo 🌸', 'Jeg sidder her hos dig 💗'],
  },
  energySwing: {
    bjorn: ['Energi op! Lad os gå! 🐻💪', 'Lav energi? Hvil lidt 🌿', 'Lyt til din krop! 🤎'],
    ræv: ['Energi er din styrke! 🦊⚡', 'Lav energi = hvil tid 🍂', 'Klog energistyring! 💡'],
    ugle: ['Energiniveau noteret 🦉', 'Hvil er også fremgang 🌙', 'Balancen er vigtig ⭐'],
    pingvin: ['Energi! Energi! 🐧⚡', 'Hvil er OK! ❄️', 'Lyt til kroppen! 💙'],
    hund: ['Energi! Lad os lege! 🐶💛', 'Træt? Hvil lidt! 🐾', 'Jeg er her uanset! ❤️'],
    kat: ['Energi... eller hvile 🐱', 'Hvil er naturligt 🌸', 'Tag det stille 💗'],
  },
  celebrate: {
    bjorn: ['FANTASTISK! 🐻🎉🎊', 'Du er en helt! ⭐🏆', 'Jeg er SÅ stolt! 🤎✨'],
    ræv: ['BRILLANT! 🦊🎊✨', 'Uovertruffen! 🍂🌟', 'Du er genial! 💡🎉'],
    ugle: ['EXCEPTIONELT! 🦉🎊', 'Visdom og mod! ⭐🌙', 'Storslået! 💜✨'],
    pingvin: ['HURRA HURRA! 🐧🎉🎊', 'DANS MED MIG! ❄️💙', 'FANTASTISK! ✨🌊'],
    hund: ['BEDSTE DAG NOGENSINDE! 🐶🎉', 'JEG ER VILDT STOLT! 💛🏆', 'DU ER PERFEKT! ❤️✨'],
    kat: ['Purr purr purr... 🐱🌸', 'Elegant mesterværk! 💗✨', 'Stille glæde! 🌺🎊'],
  },
};

/** Visual expression overlays per reaction */
const reactionOverlay: Record<
  Exclude<CompanionReaction, 'idle'>,
  { particles: string[]; bg: string; border: string }
> = {
  taskComplete: {
    particles: ['✅', '⭐', '✨'],
    bg: 'bg-emerald-400/20',
    border: 'border-emerald-400/60',
  },
  moodChange: {
    particles: ['💛', '🌸', '💜'],
    bg: 'bg-aurora-violet/20',
    border: 'border-aurora-violet/60',
  },
  energySwing: {
    particles: ['⚡', '🌊', '🔥'],
    bg: 'bg-sunrise-400/20',
    border: 'border-sunrise-400/60',
  },
  celebrate: {
    particles: ['🎉', '🎊', '⭐', '✨'],
    bg: 'bg-yellow-400/20',
    border: 'border-yellow-400/60',
  },
};

/** Animation class per reaction */
const reactionAnimation: Record<Exclude<CompanionReaction, 'idle'>, string> = {
  taskComplete: 'companion-task-complete',
  moodChange: 'companion-mood-change',
  energySwing: 'companion-energy-swing',
  celebrate: 'companion-celebrate',
};

const sizeMap = {
  sm: { container: 'w-12 h-12', text: 'text-3xl', particle: 'text-sm' },
  md: { container: 'w-20 h-20', text: 'text-5xl', particle: 'text-base' },
  lg: { container: 'w-28 h-28', text: 'text-7xl', particle: 'text-xl' },
  xl: { container: 'w-36 h-36', text: 'text-8xl', particle: 'text-2xl' },
};

const moodBg: Record<string, string> = {
  happy: 'bg-amber-400/15 border-amber-400/40',
  neutral: 'bg-midnight-700 border-midnight-600',
  excited: 'bg-yellow-400/15 border-yellow-400/40',
  sleepy: 'bg-blue-400/15 border-blue-400/40',
};

export default function CompanionAvatar({
  companion,
  size = 'md',
  animate = false,
  mood = 'happy',
  className = '',
  clickable = false,
  reaction,
  onReactionEnd,
}: CompanionAvatarProps) {
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [message, setMessage] = useState('');
  const [bounce, setBounce] = useState(false);
  const [activeReaction, setActiveReaction] = useState<Exclude<CompanionReaction, 'idle'> | null>(
    null
  );
  const [particles, setParticles] = useState<{ id: number; emoji: string; x: number; y: number }[]>(
    []
  );
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emoji = companionEmoji[companion] || '🐻';
  const name = companionName[companion] || companion;
  const messages = encouragements[companion] || encouragements['bjorn'];

  // Handle external reaction prop changes
  useEffect(() => {
    if (!reaction || reaction === 'idle') return;

    // Clear any existing timers
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    if (particleTimerRef.current) clearTimeout(particleTimerRef.current);

    const overlay = reactionOverlay[reaction];
    const reactionMsgs =
      reactionMessages[reaction][companion] || reactionMessages[reaction]['bjorn'];
    const randomMsg = reactionMsgs[Math.floor(Math.random() * reactionMsgs.length)];

    // Spawn floating particles
    const newParticles = overlay.particles.map((p, i) => ({
      id: Date.now() + i,
      emoji: p,
      x: Math.random() * 80 - 40,
      y: -(20 + Math.random() * 40),
    }));
    setParticles(newParticles);
    setActiveReaction(reaction);
    setMessage(randomMsg);
    setShowEncouragement(true);
    setBounce(true);

    particleTimerRef.current = setTimeout(() => setParticles([]), 1200);
    reactionTimerRef.current = setTimeout(() => {
      setActiveReaction(null);
      setBounce(false);
      setShowEncouragement(false);
      onReactionEnd?.();
    }, 2800);

    return () => {
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      if (particleTimerRef.current) clearTimeout(particleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reaction]);

  const handleClick = useCallback(() => {
    if (!clickable) return;
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    setMessage(randomMsg);
    setShowEncouragement(true);
    setBounce(true);
    setTimeout(() => setBounce(false), 600);
    setTimeout(() => setShowEncouragement(false), 3000);
  }, [clickable, messages]);

  const { container, text, particle: particleSize } = sizeMap[size];

  const currentOverlay = activeReaction ? reactionOverlay[activeReaction] : null;
  const currentAnimation = activeReaction ? reactionAnimation[activeReaction] : '';

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {/* Floating particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className={`absolute pointer-events-none select-none ${particleSize} animate-particle-float z-50`}
          style={{
            left: `calc(50% + ${p.x}px)`,
            top: `${p.y}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {p.emoji}
        </span>
      ))}

      {/* Encouragement / reaction bubble */}
      {showEncouragement && (
        <div
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 animate-slide-up"
          style={{ minWidth: '160px', maxWidth: '220px' }}
        >
          <div
            className={`rounded-2xl px-3 py-2 shadow-xl text-center border ${
              currentOverlay
                ? `bg-midnight-800 ${currentOverlay.border}`
                : 'bg-midnight-800 border-sunrise-400/50'
            }`}
          >
            <p className="text-xs text-midnight-100 font-medium leading-snug">{message}</p>
          </div>
          {/* Bubble tail */}
          <div
            className={`w-3 h-3 bg-midnight-800 border-r border-b rotate-45 mx-auto -mt-1.5 ${
              currentOverlay ? currentOverlay.border : 'border-sunrise-400/50'
            }`}
          />
        </div>
      )}

      {/* Avatar circle */}
      <div
        onClick={handleClick}
        role={clickable ? 'button' : 'img'}
        aria-label={clickable ? `Tryk på ${name} for opmuntring` : `Din ledsager: ${name}`}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e) => e.key === 'Enter' && handleClick() : undefined}
        className={`
          flex items-center justify-center rounded-full border-2
          ${container}
          ${currentOverlay ? `${currentOverlay.bg} ${currentOverlay.border}` : moodBg[mood]}
          ${animate && !activeReaction ? 'companion-float' : ''}
          ${currentAnimation}
          ${clickable ? 'cursor-pointer active:scale-90 hover:scale-105 transition-transform duration-200 hover:shadow-lg hover:border-sunrise-400/60' : ''}
          ${bounce && !activeReaction ? 'scale-110' : ''}
          transition-all duration-200
        `}
      >
        <span className={`select-none ${text}`}>{emoji}</span>
      </div>

      {/* Tap hint for clickable */}
      {clickable && !activeReaction && (
        <span className="text-[10px] text-midnight-500 mt-1 select-none">Tryk for opmuntring</span>
      )}
      {activeReaction && (
        <span className="text-[10px] text-sunrise-400 mt-1 select-none animate-pulse">
          {activeReaction === 'taskComplete'
            ? '✅ Klaret!'
            : activeReaction === 'moodChange'
              ? '💛 Humør'
              : activeReaction === 'energySwing'
                ? '⚡ Energi'
                : '🎉 Fejrer!'}
        </span>
      )}
    </div>
  );
}

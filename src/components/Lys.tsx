'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';

export type LysMood = 'calm' | 'energized' | 'tired' | 'happy' | 'sad' | 'focused' | 'overwhelmed';

interface LysProps {
  mood?: LysMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onTap?: () => void;
  showMessage?: boolean;
  className?: string;
  userContext?: string;
}

const moodConfig: Record<
  LysMood,
  {
    core: string;
    aura: string;
    outer: string;
    message: string;
    speed: string;
  }
> = {
  calm: {
    core: 'radial-gradient(circle, #A78BFA 0%, #7C3AED 60%, #4C1D95 100%)',
    aura: 'rgba(167, 139, 250, 0.35)',
    outer: 'rgba(167, 139, 250, 0.12)',
    message: 'Du er i god balance. Jeg er her. 💜',
    speed: 'animate-breathe-slow',
  },
  energized: {
    core: 'radial-gradient(circle, #FCD34D 0%, #FB923C 50%, #EF4444 100%)',
    aura: 'rgba(251, 146, 60, 0.4)',
    outer: 'rgba(251, 146, 60, 0.15)',
    message: 'Jeg mærker din energi! Lad os gøre noget godt i dag ✨',
    speed: 'animate-breathe',
  },
  tired: {
    core: 'radial-gradient(circle, #93C5FD 0%, #3B82F6 50%, #1E3A8A 100%)',
    aura: 'rgba(147, 197, 253, 0.3)',
    outer: 'rgba(147, 197, 253, 0.1)',
    message: 'Det er okay at hvile. Jeg holder vagt for dig 🌙',
    speed: 'animate-breathe-slow',
  },
  happy: {
    core: 'radial-gradient(circle, #6EE7B7 0%, #10B981 50%, #065F46 100%)',
    aura: 'rgba(110, 231, 183, 0.4)',
    outer: 'rgba(110, 231, 183, 0.15)',
    message: 'Din glæde lyser op i mig! 🌟',
    speed: 'animate-breathe',
  },
  sad: {
    core: 'radial-gradient(circle, #C4B5FD 0%, #8B5CF6 50%, #4C1D95 100%)',
    aura: 'rgba(196, 181, 253, 0.3)',
    outer: 'rgba(196, 181, 253, 0.1)',
    message: 'Jeg er her. Du behøver ikke sige noget. 🫂',
    speed: 'animate-breathe-slow',
  },
  focused: {
    core: 'radial-gradient(circle, #67E8F9 0%, #0EA5E9 50%, #0C4A6E 100%)',
    aura: 'rgba(103, 232, 249, 0.35)',
    outer: 'rgba(103, 232, 249, 0.12)',
    message: 'Fokus er din superkraft i dag 🎯',
    speed: 'animate-breathe',
  },
  overwhelmed: {
    core: 'radial-gradient(circle, #FCA5A5 0%, #F87171 50%, #991B1B 100%)',
    aura: 'rgba(252, 165, 165, 0.3)',
    outer: 'rgba(252, 165, 165, 0.1)',
    message: 'Ét skridt ad gangen. Bare vejrtræk. 🌬️',
    speed: 'animate-breathe-slow',
  },
};

const sizeConfig = {
  sm: { core: 40, aura: 60, outer: 80 },
  md: { core: 64, aura: 96, outer: 128 },
  lg: { core: 88, aura: 132, outer: 176 },
  xl: { core: 120, aura: 180, outer: 240 },
};

const fallbackMessages = [
  'Du gør det godt. Bare ét skridt ad gangen. 🌱',
  'Jeg er her med dig, uanset hvad. 💜',
  'Du er stærkere end du tror. ✨',
  'Det er okay ikke at have det godt. 🫂',
  'Husk at trække vejret. Ind... ud... 🌬️',
  'Du er ikke alene. Jeg holder dig selskab. 🌟',
  'Hvile er også fremgang. 🌙',
  'Du er nok, præcis som du er. 💫',
];

// Lazy-load the AI-powered tap handler to avoid SSR issues
function useLysAI(mood: LysMood, userContext?: string) {
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const requestAiMessage = async () => {
    if (typeof window === 'undefined') return;
    setAiLoading(true);
    try {
      const contextNote = userContext ? ` Brugerens kontekst: ${userContext}.` : '';
      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'ANTHROPIC',
          model: ANTHROPIC_CHAT_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'Du er Lys — en varm, empatisk ledsager i en dansk mental sundhedsapp. Du sender korte, personlige trøstebeskeder (max 2 sætninger, max 25 ord). Brug et enkelt emoji til sidst. Vær varm, nærværende og aldrig klichéfyldt.',
            },
            {
              role: 'user',
              content: `Brugeren har trykket på mig. Deres nuværende stemning er: ${mood}.${contextNote} Send en personlig, varm besked.`,
            },
          ],
          stream: false,
          parameters: { max_tokens: 80, temperature: 0.85 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && mountedRef.current) setAiMessage(text.trim());
      }
    } catch {
      // silently fail — fallback message already shown
    } finally {
      if (mountedRef.current) setAiLoading(false);
    }
  };

  return { aiMessage, aiLoading, requestAiMessage };
}

export default function Lys({
  mood = 'calm',
  size = 'md',
  onTap,
  showMessage = false,
  className = '',
  userContext,
}: LysProps) {
  const [message, setMessage] = useState('');
  const [showComfort, setShowComfort] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const config = moodConfig[mood];
  const sizes = sizeConfig[size];
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { aiMessage, aiLoading, requestAiMessage } = useLysAI(mood, userContext);

  useEffect(() => {
    if (showMessage) {
      setMessage(config.message);
    }
  }, [mood, showMessage, config.message]);

  // Update displayed message when AI responds
  useEffect(() => {
    if (aiMessage && showComfort) {
      setMessage(aiMessage);
    }
  }, [aiMessage, showComfort]);

  const handleTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    // Show fallback immediately
    const fallback = fallbackMessages[newCount % fallbackMessages.length];
    setMessage(fallback);
    setShowComfort(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowComfort(false), 4500);

    // Request personalized AI message (client-side only)
    requestAiMessage();
    onTap?.();
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <button
        onClick={handleTap}
        className="relative flex items-center justify-center cursor-pointer focus:outline-none active:scale-95 transition-transform duration-200"
        style={{ width: sizes.outer, height: sizes.outer }}
        aria-label="Lys — din ledsager. Tryk for trøst"
      >
        <div
          className="absolute rounded-full lys-outer"
          style={{ width: sizes.outer, height: sizes.outer, background: config.outer }}
        />
        <div
          className="absolute rounded-full lys-aura"
          style={{ width: sizes.aura, height: sizes.aura, background: config.aura }}
        />
        <div
          className="relative rounded-full lys-core shadow-2xl"
          style={{ width: sizes.core, height: sizes.core, background: config.core }}
        >
          <div
            className="absolute inset-0 rounded-full opacity-40"
            style={{
              background:
                'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6) 0%, transparent 60%)',
            }}
          />
        </div>
      </button>

      {(showComfort || showMessage) && message && (
        <div className="animate-slide-up text-center max-w-xs">
          <p className="text-sm text-midnight-200 leading-relaxed bg-midnight-800/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-midnight-600/50">
            {aiLoading && showComfort ? (
              <span className="flex items-center gap-2 justify-center">
                <span
                  className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </span>
            ) : (
              message
            )}
          </p>
        </div>
      )}
    </div>
  );
}

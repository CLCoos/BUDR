'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import { toast } from 'sonner';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';
import { EnergyLevel } from './DailyChallengesView';

interface Props {
  energy: EnergyLevel;
  energyLabel: string;
  challengeCount: number;
}

const FALLBACK = {
  response: '',
  isLoading: false as const,
  error: null as Error | null,
  sendMessage: async () => {},
};

export default function AiMotivationStrip({ energy, energyLabel, challengeCount }: Props) {
  const [aiMotivation, setAiMotivation] = useState('');
  const [lastEnergy, setLastEnergy] = useState<EnergyLevel | null>(null);

  const chatResult = useChat('ANTHROPIC', ANTHROPIC_CHAT_MODEL, false);
  const { response, isLoading, sendMessage, error } = chatResult ?? FALLBACK;

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  const fetchMotivation = useCallback(
    (level: EnergyLevel, label: string, count: number) => {
      sendMessage(
        [
          {
            role: 'system',
            content: `Du er Lys — en varm ledsager i en dansk mental sundhedsapp. Skriv en kort, personlig motivationsbesked til brugeren baseret på deres energiniveau. Max 2 sætninger, max 25 ord. Vær specifik og opmuntrende. Afslut med ét emoji.`,
          },
          {
            role: 'user',
            content: `Brugeren har valgt energiniveau: ${label} (${level}/5). Der er ${count} udfordringer tilgængelige for dem i dag. Giv dem en personlig motivationsbesked.`,
          },
        ],
        { max_tokens: 70, temperature: 0.8 }
      );
    },
    [sendMessage]
  );

  // Fetch on mount
  useEffect(() => {
    fetchMotivation(energy, energyLabel, challengeCount);
    setLastEnergy(energy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when energy changes
  useEffect(() => {
    if (lastEnergy !== null && lastEnergy !== energy) {
      setAiMotivation('');
      fetchMotivation(energy, energyLabel, challengeCount);
      setLastEnergy(energy);
    }
  }, [energy, energyLabel, challengeCount, lastEnergy, fetchMotivation]);

  useEffect(() => {
    if (response && !isLoading) {
      setAiMotivation(response.trim());
    }
  }, [response, isLoading]);

  if (!aiMotivation && !isLoading) return null;

  return (
    <div className="mb-4 bg-midnight-800/50 border border-aurora-violet/20 rounded-2xl px-4 py-3 flex items-start gap-3 animate-fade-in">
      <span className="text-base mt-0.5">🔮</span>
      <div className="flex-1">
        {isLoading && !aiMotivation ? (
          <div className="flex items-center gap-1.5 py-1">
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
          </div>
        ) : (
          <p className="text-sm text-midnight-200 leading-relaxed">{aiMotivation}</p>
        )}
      </div>
    </div>
  );
}

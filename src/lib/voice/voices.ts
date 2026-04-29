/** Konfiguration af default-stemmer (ElevenLabs). */

export type VoiceProfile = {
  id: string;
  name: string;
  description: string;
  gender: 'female' | 'male';
};

export const DEFAULT_VOICES: VoiceProfile[] = [
  {
    // NB: Denne voice har historisk ligget under "Daniel" men er kvindestemme.
    id: 'cgSgspJ2msm6clMCkdW9',
    name: 'Stine',
    description: 'Voksen, jordnær',
    gender: 'female',
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Sarah',
    description: 'Varm, rolig, godt til samtaler om svære emner',
    gender: 'female',
  },
  {
    id: 'XrExE9yKIg1WjnnlVkGX',
    name: 'Matilda',
    description: 'Naturlig, hverdagsagtig dansk',
    gender: 'female',
  },
  {
    id: 'pFZP5JQG7iQjIQuC4Bku',
    name: 'Lily',
    description: 'Lys, ung, energisk',
    gender: 'female',
  },
  {
    id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    description: 'Rolig, omsorgsfuld',
    gender: 'male',
  },
  {
    id: 'iP95p4xoKVk53GoZ742B',
    name: 'Chris',
    description: 'Naturlig, hverdagsagtig',
    gender: 'male',
  },
];

export const STINE_VOICE_ID = 'cgSgspJ2msm6clMCkdW9';
export const CHRIS_VOICE_ID = 'iP95p4xoKVk53GoZ742B';

/** De stemmer vi faktisk bruger i Lys (valg: kvinde vs. mand). */
export const LYS_VOICE_CHOICES: VoiceProfile[] = DEFAULT_VOICES.filter(
  (v) => v.id === STINE_VOICE_ID || v.id === CHRIS_VOICE_ID
);

export const DEFAULT_FEMALE_VOICE_ID = STINE_VOICE_ID;
export const DEFAULT_MALE_VOICE_ID = CHRIS_VOICE_ID;

export function getVoiceById(id: string | null): VoiceProfile | null {
  if (!id) return null;
  return DEFAULT_VOICES.find((v) => v.id === id) ?? null;
}

export function isKnownElevenLabsVoiceId(id: string): boolean {
  return DEFAULT_VOICES.some((v) => v.id === id);
}

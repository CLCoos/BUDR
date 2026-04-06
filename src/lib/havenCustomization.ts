import type { HavenAmbientPeriod } from '@/components/haven/havenConstants';

export type HavenSkyMood =
  | 'realtime'
  | 'aurora'
  | 'sunset_punch'
  | 'midnight_jade'
  | 'rose_glow'
  | 'electric_dusk';

export type HavenFrameStyle = 'none' | 'gold' | 'neon_lime' | 'opal';

export type HavenCustomization = {
  skyMood: HavenSkyMood;
  frame: HavenFrameStyle;
  butterflies: boolean;
  /** Vises på del-kort — ingen persondata */
  vibeLine: string;
};

export const HAVEN_DEFAULT_CUSTOMIZATION: HavenCustomization = {
  skyMood: 'realtime',
  frame: 'opal',
  butterflies: true,
  vibeLine: 'Lidt grønt hver dag ✦',
};

export const HAVEN_VIBE_LINES = [
  'Lidt grønt hver dag ✦',
  'Jeg vander mit rolige sted 🌿',
  'Vækst i mit eget tempo 🌱',
  'Min oase — min energi 💧',
  'Små skridt, store blade 🍃',
  'Havehjerte — Lys & jord ✨',
] as const;

const storageKey = (residentId: string) => `budr_haven_style_v1:${residentId}`;

export function loadHavenCustomization(residentId: string): HavenCustomization {
  if (!residentId) return { ...HAVEN_DEFAULT_CUSTOMIZATION };
  try {
    const raw = localStorage.getItem(storageKey(residentId));
    if (!raw) return { ...HAVEN_DEFAULT_CUSTOMIZATION };
    const p = JSON.parse(raw) as Partial<HavenCustomization>;
    return {
      ...HAVEN_DEFAULT_CUSTOMIZATION,
      ...p,
      vibeLine:
        typeof p.vibeLine === 'string' && p.vibeLine.trim().length > 0
          ? p.vibeLine.trim().slice(0, 80)
          : HAVEN_DEFAULT_CUSTOMIZATION.vibeLine,
    };
  } catch {
    return { ...HAVEN_DEFAULT_CUSTOMIZATION };
  }
}

export function saveHavenCustomization(residentId: string, c: HavenCustomization): void {
  if (!residentId) return;
  try {
    localStorage.setItem(storageKey(residentId), JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

/** Himle der er bygget til at se godt ud på skærm + story. */
const SKY_PRESETS: Record<Exclude<HavenSkyMood, 'realtime'>, string> = {
  aurora:
    'linear-gradient(168deg, #0f172a 0%, #312e81 22%, #5b21b6 48%, #0d9488 78%, #34d399 100%)',
  sunset_punch:
    'linear-gradient(175deg, #4c0519 0%, #be123c 28%, #fb923c 55%, #fde047 82%, #fef9c3 100%)',
  midnight_jade: 'linear-gradient(180deg, #020617 0%, #0f766e 42%, #134e4a 72%, #022c22 100%)',
  rose_glow:
    'linear-gradient(165deg, #1e1b4b 0%, #9d174d 35%, #f472b6 62%, #fda4af 88%, #fff1f2 100%)',
  electric_dusk:
    'linear-gradient(180deg, #172554 0%, #4338ca 40%, #a855f7 68%, #f0abfc 92%, #fdf4ff 100%)',
};

export function resolveHavenSkyGradient(mood: HavenSkyMood, ambient: HavenAmbientPeriod): string {
  if (mood === 'realtime') return ambient.sky;
  return SKY_PRESETS[mood] ?? ambient.sky;
}

export function havenFrameClass(frame: HavenFrameStyle): string {
  switch (frame) {
    case 'gold':
      return 'haven-frame-gold';
    case 'neon_lime':
      return 'haven-frame-neon';
    case 'opal':
      return 'haven-frame-opal';
    default:
      return '';
  }
}

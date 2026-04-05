export type HavenPlantType = 'tree' | 'flower' | 'herb' | 'bush' | 'vegetable';

export const HAVEN_PLANT_ACCENTS: Record<HavenPlantType, string> = {
  tree: '#1D9E75',
  flower: '#F59E0B',
  herb: '#10B981',
  bush: '#7F77DD',
  vegetable: '#EF4444',
};

export const HAVEN_PLANT_LABELS: Record<HavenPlantType, string> = {
  tree: 'Træ',
  flower: 'Blomst',
  herb: 'Urt',
  bush: 'Busk',
  vegetable: 'Grøntsag',
};

export const HAVEN_STAGE_LABELS = ['Frø 🌱', 'Spire 🌿', 'Ung 🌾', 'Moden 🌸', 'Fuld 🌳'] as const;

export const HAVEN_WATER_THRESHOLDS = [0, 20, 60, 120, 200] as const;

export type HavenAmbientPeriod = {
  label: string;
  sky: string;
  ground: string;
  horizon: string;
  textColor: string;
};

export function getHavenAmbientPeriod(h: number): HavenAmbientPeriod {
  if (h >= 5 && h < 8)
    return {
      label: 'tidlig morgen',
      sky: 'linear-gradient(180deg, #1a1060 0%, #f97316 60%, #fde68a 100%)',
      ground: '#2d4a1e',
      horizon: '#f97316',
      textColor: '#fff',
    };
  if (h >= 8 && h < 12)
    return {
      label: 'formiddag',
      sky: 'linear-gradient(180deg, #38bdf8 0%, #7dd3fc 60%, #e0f2fe 100%)',
      ground: '#2d6a1e',
      horizon: '#bae6fd',
      textColor: '#0f172a',
    };
  if (h >= 12 && h < 16)
    return {
      label: 'eftermiddag',
      sky: 'linear-gradient(180deg, #1d4ed8 0%, #60a5fa 60%, #bfdbfe 100%)',
      ground: '#1e5216',
      horizon: '#93c5fd',
      textColor: '#0f172a',
    };
  if (h >= 16 && h < 19)
    return {
      label: 'sen eftermiddag',
      sky: 'linear-gradient(180deg, #9333ea 0%, #f97316 50%, #fbbf24 100%)',
      ground: '#1a3d12',
      horizon: '#f97316',
      textColor: '#fff',
    };
  if (h >= 19 && h < 22)
    return {
      label: 'aften',
      sky: 'linear-gradient(180deg, #0f172a 0%, #1e3a5f 50%, #374151 100%)',
      ground: '#0f2309',
      horizon: '#1e3a5f',
      textColor: '#e2e8f0',
    };
  return {
    label: 'nat',
    sky: 'linear-gradient(180deg, #020617 0%, #0f172a 60%, #1e293b 100%)',
    ground: '#0a1806',
    horizon: '#1e293b',
    textColor: '#cbd5e1',
  };
}

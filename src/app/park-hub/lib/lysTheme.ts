export type LysPhase = 'morning' | 'afternoon' | 'evening' | 'night';

export type LysThemeTokens = {
  bg: string;
  accent: string;
  text: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
  gradientFrom: string;
  gradientTo: string;
  accentSoft: string;
  accentSoftText: string;
};

export function getLysPhase(date: Date): LysPhase {
  const h = date.getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 24) return 'evening';
  return 'night';
}

export function lysTheme(phase: LysPhase): LysThemeTokens {
  switch (phase) {
    case 'morning':
      return {
        bg: '#FDFAF5',
        accent: '#F59E0B',
        text: '#1C1917',
        textMuted: 'rgba(28, 25, 23, 0.65)',
        cardBg: 'rgba(255, 255, 255, 0.85)',
        cardBorder: 'rgba(245, 158, 11, 0.2)',
        gradientFrom: 'rgba(253, 250, 245, 1)',
        gradientTo: 'rgba(254, 243, 199, 0.6)',
        accentSoft: 'rgba(254, 243, 199, 0.9)',
        accentSoftText: '#B45309',
      };
    case 'afternoon':
      return {
        bg: '#F5F4FF',
        accent: '#7F77DD',
        text: '#0F1B2D',
        textMuted: 'rgba(15, 27, 45, 0.65)',
        cardBg: 'rgba(255, 255, 255, 0.9)',
        cardBorder: 'rgba(127, 119, 221, 0.25)',
        gradientFrom: 'rgba(245, 244, 255, 1)',
        gradientTo: 'rgba(199, 210, 254, 0.5)',
        accentSoft: 'rgba(229, 231, 255, 0.95)',
        accentSoftText: '#5E56C0',
      };
    case 'evening':
      return {
        bg: '#0F1B2D',
        accent: '#1D9E75',
        text: '#F5F4FF',
        textMuted: 'rgba(245, 244, 255, 0.7)',
        cardBg: 'rgba(255, 255, 255, 0.08)',
        cardBorder: 'rgba(29, 158, 117, 0.35)',
        gradientFrom: 'rgba(15, 27, 45, 1)',
        gradientTo: 'rgba(29, 158, 117, 0.25)',
        accentSoft: 'rgba(29, 158, 117, 0.2)',
        accentSoftText: '#6EE7B7',
      };
    default:
      return {
        bg: '#0A1220',
        accent: '#7F77DD',
        text: '#E2E8F0',
        textMuted: 'rgba(226, 232, 240, 0.65)',
        cardBg: 'rgba(255, 255, 255, 0.06)',
        cardBorder: 'rgba(127, 119, 221, 0.3)',
        gradientFrom: 'rgba(10, 18, 32, 1)',
        gradientTo: 'rgba(79, 70, 229, 0.2)',
        accentSoft: 'rgba(127, 119, 221, 0.18)',
        accentSoftText: '#C4B5FD',
      };
  }
}

export function phaseDaLabel(phase: LysPhase): string {
  switch (phase) {
    case 'morning':
      return 'morgen';
    case 'afternoon':
      return 'eftermiddag';
    case 'evening':
      return 'aften';
    default:
      return 'nat';
  }
}

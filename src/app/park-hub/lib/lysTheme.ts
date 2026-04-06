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
  shadow: string;
  glowShadow: string;
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
        textMuted: 'rgba(28, 25, 23, 0.55)',
        cardBg: 'rgba(255, 255, 255, 0.80)',
        cardBorder: 'rgba(245, 158, 11, 0.15)',
        gradientFrom: '#FDFAF5',
        gradientTo: 'rgba(254, 243, 199, 0.7)',
        accentSoft: 'rgba(254, 243, 199, 0.95)',
        accentSoftText: '#92400E',
        shadow: '0 4px 24px rgba(245,158,11,0.10), 0 1px 8px rgba(0,0,0,0.04)',
        glowShadow: '0 8px 40px rgba(245,158,11,0.22)',
      };
    case 'afternoon':
      return {
        bg: '#F5F4FF',
        accent: '#7F77DD',
        text: '#0F1B2D',
        textMuted: 'rgba(15, 27, 45, 0.55)',
        cardBg: 'rgba(255, 255, 255, 0.85)',
        cardBorder: 'rgba(127, 119, 221, 0.18)',
        gradientFrom: '#F5F4FF',
        gradientTo: 'rgba(199, 210, 254, 0.55)',
        accentSoft: 'rgba(229, 231, 255, 0.95)',
        accentSoftText: '#4338CA',
        shadow: '0 4px 24px rgba(127,119,221,0.12), 0 1px 8px rgba(0,0,0,0.04)',
        glowShadow: '0 8px 40px rgba(127,119,221,0.28)',
      };
    case 'evening':
      return {
        bg: '#0C1829',
        accent: '#1D9E75',
        text: '#F0EEF8',
        textMuted: 'rgba(240, 238, 248, 0.55)',
        cardBg: 'rgba(255, 255, 255, 0.07)',
        cardBorder: 'rgba(29, 158, 117, 0.28)',
        gradientFrom: '#0C1829',
        gradientTo: 'rgba(29, 158, 117, 0.22)',
        accentSoft: 'rgba(29, 158, 117, 0.18)',
        accentSoftText: '#6EE7B7',
        shadow: '0 4px 24px rgba(0,0,0,0.30), 0 1px 8px rgba(0,0,0,0.10)',
        glowShadow: '0 8px 40px rgba(29,158,117,0.32)',
      };
    default: // night
      return {
        bg: '#080E1C',
        accent: '#7F77DD',
        text: '#E2E0F5',
        textMuted: 'rgba(226, 224, 245, 0.50)',
        cardBg: 'rgba(255, 255, 255, 0.055)',
        cardBorder: 'rgba(127, 119, 221, 0.22)',
        gradientFrom: '#080E1C',
        gradientTo: 'rgba(79, 70, 229, 0.18)',
        accentSoft: 'rgba(127, 119, 221, 0.16)',
        accentSoftText: '#C4B5FD',
        shadow: '0 4px 24px rgba(0,0,0,0.40), 0 1px 8px rgba(0,0,0,0.15)',
        glowShadow: '0 8px 40px rgba(127,119,221,0.30)',
      };
  }
}

export function phaseDaLabel(phase: LysPhase): string {
  switch (phase) {
    case 'morning':   return 'morgen';
    case 'afternoon': return 'eftermiddag';
    case 'evening':   return 'aften';
    default:          return 'nat';
  }
}

import type { CSSProperties } from 'react';

/** Venstrekant: grøn/teal = AI-spor, rav = original — kun i sammenligningstilstand */
export function compareEditorChrome(
  carePortalDark: boolean | undefined,
  compareMode: boolean,
  compareSource: 'original' | 'ai'
): { className: string; style?: CSSProperties } {
  if (!compareMode) return { className: '' };
  if (carePortalDark) {
    return {
      className: 'rounded-l-xl pl-3',
      style: {
        borderLeftWidth: 3,
        borderLeftStyle: 'solid',
        borderLeftColor: compareSource === 'ai' ? 'var(--cp-green)' : 'var(--cp-amber)',
      },
    };
  }
  return {
    className: `rounded-l-xl border-l-[3px] pl-3 ${
      compareSource === 'ai' ? 'border-l-teal-500' : 'border-l-amber-500'
    }`,
  };
}

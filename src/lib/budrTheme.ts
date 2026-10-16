/** Synkroniserer Care Portal-tema (`#care-portal-shell`) og design-system (`<html>`). */
export type BudrTheme = 'dark' | 'light';

/** Ny nøgle ved nyt look (2026-10): alle starter i lyst tema, mørkt kan stadig vælges. */
const THEME_KEY = 'budr-theme-v2';

export function readStoredBudrTheme(): BudrTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyBudrTheme(theme: BudrTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('care-portal-shell')?.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

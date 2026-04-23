/** Synkroniserer Care Portal-tema (`#care-portal-shell`) og design-system (`<html>`). */
export type BudrTheme = 'dark' | 'light';

export function readStoredBudrTheme(): BudrTheme {
  if (typeof window === 'undefined') return 'dark';
  const raw = localStorage.getItem('budr-theme');
  return raw === 'light' ? 'light' : 'dark';
}

export function applyBudrTheme(theme: BudrTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('care-portal-shell')?.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('budr-theme', theme);
  } catch {
    /* ignore */
  }
}

/**
 * Når serveren finder krisetegn i noget, borgeren har skrevet, svarer den med `safety`.
 * Komponenten, der sendte teksten, kalder `signalLysSafety`, og Lys-skallen åbner hjælp.
 */
export type LysSafetyLevel = 'none' | 'elevated' | 'acute';

const EVENT = 'lys:safety';

export function signalLysSafety(level: unknown): void {
  if (typeof window === 'undefined') return;
  if (level !== 'elevated' && level !== 'acute') return;
  window.dispatchEvent(new CustomEvent<LysSafetyLevel>(EVENT, { detail: level }));
}

export function onLysSafety(handler: (level: LysSafetyLevel) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<LysSafetyLevel>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

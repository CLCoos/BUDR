/**
 * GA4 events — kun når `NEXT_PUBLIC_GA_MEASUREMENT_ID` er sat og gtag er indlæst.
 * Ingen-op hvis måling mangler (lokalt / demo).
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function isGaConfigured(): boolean {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!id) return false;
  if (id.includes('your-google') || id.includes('placeholder')) return false;
  return true;
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean | undefined>
): void {
  if (typeof window === 'undefined' || !isGaConfigured()) return;
  const gtag = window.gtag;
  if (typeof gtag !== 'function') return;
  let clean: Record<string, string | number | boolean> | undefined;
  if (params) {
    clean = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) clean[k] = v;
    }
  }
  gtag('event', name, clean);
}

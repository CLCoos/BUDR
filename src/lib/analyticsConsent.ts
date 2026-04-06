export const ANALYTICS_CONSENT_KEY = 'budr_analytics_consent';

export type AnalyticsConsentValue = 'granted' | 'denied';

export function readAnalyticsConsent(): AnalyticsConsentValue | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (v === 'granted' || v === 'denied') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeAnalyticsConsent(value: AnalyticsConsentValue): void {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    /* ignore */
  }
}

export function analyticsConsentBypassed(): boolean {
  return process.env.NEXT_PUBLIC_GA_BYPASS_CONSENT === 'true';
}

import type { Config } from '@netlify/functions';

/**
 * Hvert 5. minut: kald /api/health, så Next.js-serverfunktionen ikke går i dvale.
 * En kold funktion giver flere sekunders ventetid på første sidevisning.
 */
export default async function handler() {
  const base = process.env.URL;
  if (!base) return;
  try {
    const res = await fetch(`${base}/api/health`, { cache: 'no-store' });
    if (!res.ok) console.error('[keep-warm] /api/health svarede', res.status);
  } catch (err) {
    console.error('[keep-warm] fejlede', err);
  }
}

export const config: Config = {
  schedule: '*/5 * * * *',
};

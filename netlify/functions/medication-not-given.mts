import type { Config } from '@netlify/functions';

/** Hvert 15. minut: alarmér personalet om faste medicindoser, der ikke er registreret udleveret. */
export default async function handler() {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error('[medication-not-given] mangler URL eller CRON_SECRET');
    return;
  }

  const res = await fetch(`${base}/api/cron/medication-not-given`, {
    method: 'POST',
    headers: { 'x-cron-secret': secret },
  });
  if (!res.ok) {
    console.error('[medication-not-given] fejlede', res.status, await res.text());
    return;
  }
  const { created } = (await res.json()) as { created: number };
  if (created > 0) console.info(`[medication-not-given] oprettede ${created} alarmer`);
}

export const config: Config = {
  schedule: '*/15 * * * *',
};

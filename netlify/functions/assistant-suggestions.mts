import type { Config } from '@netlify/functions';

/** Hver halve time: assistenten kigger efter ting, personalet bør følge op på. */
export default async function handler() {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error('[assistant-suggestions] mangler URL eller CRON_SECRET');
    return;
  }

  const res = await fetch(`${base}/api/cron/assistant-suggestions`, {
    method: 'POST',
    headers: { 'x-cron-secret': secret },
  });
  if (!res.ok) {
    console.error('[assistant-suggestions] fejlede', res.status, await res.text());
    return;
  }
  const { created, expired } = (await res.json()) as { created: number; expired: number };
  if (created > 0 || expired > 0) {
    console.info(`[assistant-suggestions] ${created} nye forslag, ${expired} udløbet`);
  }
}

export const config: Config = {
  schedule: '*/30 * * * *',
};

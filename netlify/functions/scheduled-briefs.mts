import type { Config } from '@netlify/functions';

export default async function handler() {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error('[scheduled-briefs] mangler URL eller CRON_SECRET');
    return;
  }

  const listRes = await fetch(`${base}/api/cron/generate-briefs?mode=list`, {
    method: 'POST',
    headers: { 'x-cron-secret': secret },
  });
  if (!listRes.ok) {
    console.error('[scheduled-briefs] list fejlede', listRes.status);
    return;
  }
  const { residents } = (await listRes.json()) as { residents: string[] };

  const isMonday = new Date().getUTCDay() === 1;
  const types: ('daily' | 'weekly')[] = isMonday ? ['daily', 'weekly'] : ['daily'];

  for (const type of types) {
    await Promise.all(
      residents.map((id) =>
        fetch(`${base}/api/cron/generate-briefs?type=${type}&resident_id=${id}`, {
          method: 'POST',
          headers: { 'x-cron-secret': secret },
        }).catch((e) => console.error('[scheduled-briefs]', type, id, e)),
      ),
    );
  }
  console.log(
    `[scheduled-briefs] kørte for ${residents.length} borgere, typer: ${types.join(', ')}`,
  );
}

export const config: Config = {
  schedule: '0 5 * * *',
};

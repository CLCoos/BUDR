import { NextRequest, NextResponse } from 'next/server';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { claudeApiKey } from '@/lib/ai/claudeTransport';
import { clipText, createAliasMap, namePartsFor } from '@/lib/ai/aliases';
import { requireStaffForAi } from '@/lib/ai/staffAiAuth';
import { PERMISSIONS } from '@/lib/permissions';

export const maxDuration = 60;

const MAX_RESIDENTS = 40;

const SYSTEM = `Du hjælper pædagoger på et socialpsykiatrisk botilbud med at skrive vagtskifterapporten. Skriv kort, præcist og professionelt dansk, der er let at læse højt ved vagtskifte.

Borgerne hedder "Borger 1", "Borger 2" osv. Brug præcis de betegnelser, så navnene kan sættes ind bagefter.

Brug PRÆCIS disse fire overskrifter på egne linjer (nummer + punktum + titel):
1. Kort overblik
2. Borgere med særlig fokus
3. Øvrige borgere
4. Til næste vagt

Under hver overskrift: højst 2 korte afsnit eller en punktliste med · foran hvert punkt. Ingen andre overskrifter.
Afsnit 1: hvor mange har tjekket ind, og om nogen kræver ekstra fokus (én eller to sætninger).
Afsnit 2: kun borgere med rød/gul, dårlig stemning eller åbne beskeder. Er der ingen, så skriv én sætning om det.
Afsnit 3: resten i meget korte linjer.
Afsnit 4: konkrete punkter til næste vagt med ·

Regler:
- Brug KUN de oplysninger, du får. Opfind aldrig hændelser, årsager, aftaler eller tal.
- Skriv hvad der er registreret, ikke gæt om hvorfor. Ingen diagnoser og ingen råd om medicin.
- Citér borgerens note ordret, hvis du gengiver den.
- Højst ca. 280 ord. Afslut ikke med metatekst om AI.`;

type ResidentIn = {
  name?: unknown;
  initials?: unknown;
  moodLabel?: unknown;
  trafficLight?: unknown;
  checkinTime?: unknown;
  notePreview?: unknown;
  pendingMessages?: unknown;
};

export async function POST(req: NextRequest) {
  const auth = await requireStaffForAi(PERMISSIONS.VIEW_RESIDENTS);
  if (!auth.ok) return auth.response;

  let body: { residents?: ResidentIn[]; dateStr?: unknown; timeStr?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const residents = Array.isArray(body.residents) ? body.residents.slice(0, MAX_RESIDENTS) : [];
  if (residents.length === 0) {
    return NextResponse.json({ error: 'Ingen borgere' }, { status: 400 });
  }

  const key = claudeApiKey();
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  const people = residents.map((r) => {
    const label = clipText(r.name, 80) || 'Borger';
    return { label, names: namePartsFor(label, clipText(r.initials, 4)) };
  });
  const aliases = createAliasMap(people);

  const lines = residents.map((r, i) => {
    const parts = [`${aliases.alias(i)}:`];
    const checkinTime = clipText(r.checkinTime, 10);
    const mood = clipText(r.moodLabel, 40);
    const light = clipText(r.trafficLight, 10);
    const note = clipText(r.notePreview, 160);
    const pending = typeof r.pendingMessages === 'number' ? r.pendingMessages : 0;
    if (checkinTime) parts.push(`check-in kl. ${checkinTime}`);
    if (mood) parts.push(`stemning: ${mood}`);
    if (light) parts.push(`trafiklys: ${light}`);
    if (note) parts.push(`note: "${aliases.hide(note)}"`);
    if (pending > 0) parts.push(`${pending} besked(er) til personalet`);
    if (!checkinTime) parts.push('ingen check-in i dag');
    return parts.join(', ');
  });

  const dateStr = clipText(body.dateStr, 40);
  const timeStr = clipText(body.timeStr, 10);
  const userMessage = `Vagtskifterapport, ${dateStr}, kl. ${timeStr}\n\nBorgerdata for i dag:\n${lines.join('\n')}\n\nSkriv overrapporten.`;

  const result = await callAnthropicJournalPolish({
    apiKey: key,
    system: SYSTEM,
    userMessage,
    maxTokens: 700,
    temperature: 0.2,
  });
  if (!result.ok) {
    console.error('[ai/overrapport] failed:', result.lastModel, result.status);
    return NextResponse.json({ error: 'AI svarer ikke' }, { status: 502 });
  }
  return NextResponse.json({ text: aliases.restore(result.text) });
}

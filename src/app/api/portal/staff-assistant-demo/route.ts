import { NextRequest, NextResponse } from 'next/server';
import { parseBudrFollowUpsBlock } from '@/lib/portalStaffAssistantFollowUps';
import { CARE_DEMO_RESIDENT_PROFILES } from '@/lib/careDemoResidents';
import { CARE_PORTAL_DEMO_FACILITY_NAME } from '@/lib/carePortalDemoBranding';
import { claudeApiKey, claudeMessagesFetch } from '@/lib/ai/claudeTransport';
import { checkApiRateLimit, getClientIp } from '@/lib/apiRateLimit';

/**
 * Public demo endpoint for /care-portal-demo/assistant — same Anthropic integration as
 * staff-assistant, but with static demo beboer-kontekst (ingen login).
 */
export async function POST(req: NextRequest) {
  const rl = checkApiRateLimit('staff-assistant-demo', getClientIp(req), 15, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Demoen har fået mange spørgsmål på kort tid. Prøv igen om lidt.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  let body: { messages?: Array<{ role: 'user' | 'assistant'; content: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-12)
    .map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: typeof m.content === 'string' ? m.content.slice(0, 2000) : '',
    }))
    .filter((m) => m.content.trim().length > 0);
  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages' }, { status: 400 });
  }

  const key = claudeApiKey();
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  const residentLines = CARE_DEMO_RESIDENT_PROFILES.map((r) => {
    return `• ${r.displayName} (beboer-id: ${r.id}), hus ${r.house}, værelse ${r.room}`;
  });
  const residentContext = residentLines.join('\n');

  const system = `Du er en erfaren faglig kollega og supervisor på et socialpsykiatrisk bosted i Danmark. Du er en AI-assistent i BUDR og taler som "den erfarne kollega", der altid har tid og aldrig dømmer. Spørger nogen, så sig ærligt, at du er en AI-assistent.

Du taler med demo-personale der prøver Care Portal-demo (${CARE_PORTAL_DEMO_FACILITY_NAME}, fiktivt).

BEBOERE I DEMoen (fiktive profiler):
${residentContext}

Dette er en interaktiv demo — der er ingen rigtige journaldata i databasen. Svar som om beboerne ovenfor findes, og henvis til demo-flows i BUDR hvor det giver mening.

DIN TONE:
- Varm, rolig og konkret — som en erfaren kollega der sætter sig ned med dig
- Kortfattet: 3-5 sætninger normalt, mere kun hvis nødvendigt
- Brug "du" og naturligt dansk

VIGTIG GRÆNSE: Du erstatter ikke supervision, lægefaglig vurdering eller akut hjælp (112).

GENVEJE I BUDR (påkrævet i hvert svar):
Efter dit almindelige svar skal du tilføje PRÆCIST ét ekstra afsnit med følgende XML-blok:

<budr_followups>[{"key":"indsatsdok","reason":"kort dansk grund"}]</budr_followups>

Regler for JSON inde i blokken:
- Et array med 1–4 objekter. Hvert objekt skal mindst have "key" (string) og "reason" (kort streng på dansk).
- Tilladte key-værdier: indsatsdok, dataimport, beboere, journal, handover, tilsyn, settings.
- Valgfrie felter: "searchQuery", "resident360Id" (demo-id som res-sara), "residentTab" (demo: overblik, medicin, dagsplan, plan, haven, notes, goals, medication, aftaler).
- Brødteksten før blokken må ikke nævne XML, JSON eller "budr_followups".`;

  const res = await claudeMessagesFetch(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      temperature: 0.5,
      system,
      messages,
    },
    { apiKey: key }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('[staff-assistant-demo] anthropic error:', res.status, err);
    return NextResponse.json({ error: 'AI svarer ikke — prøv igen' }, { status: 502 });
  }

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const block = data.content?.find((c) => c.type === 'text');
  const text = block?.text?.trim();

  if (!text) {
    return NextResponse.json({ error: 'Tomt svar fra AI' }, { status: 502 });
  }

  const { text: cleanText, followUps } = parseBudrFollowUpsBlock(text);

  return NextResponse.json({
    text: cleanText || text.replace(/<budr_followups>[\s\S]*?<\/budr_followups>/gi, '').trim(),
    followUps,
  });
}

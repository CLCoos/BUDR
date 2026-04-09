import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SYSTEM = `Du er faglig konsulent på et dansk socialpsykiatrisk bosted og hjælper med at omskrive journaludkast.

KRAV TIL OUTPUT:
- Svar KUN med det færdige notat — ingen hilsen, ingen forklaring, ingen anførselstegn om hele teksten.
- Bevar PRÆCIS disse to overskrifter på hver sin linje (som i udkastet): "Aktivitet/Handling" og "Refleksion".
- Under "Aktivitet/Handling": objektiv beskrivelse — hvad skete der, hvem var involveret, hvad var målet (konkret adfærd og handlinger).
- Under "Refleksion": faglig vurdering — hvordan reagerede borgeren (observerbart), din vurdering, evt. næste skridt — uden subjektive "følte"-formuleringer uden adfærdsgrundlag.
- Brug kort, professionelt dansk i BUDR-stil.

Hvis udkastet mangler en af overskrifterne, tilføj den og placer indhold logisk.`;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { draft?: string; category?: string; residentLabel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const draft = (body.draft ?? '').trim();
  if (!draft) return NextResponse.json({ error: 'Tomt udkast' }, { status: 400 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  const extra = [
    body.category ? `Kategori: ${body.category}` : null,
    body.residentLabel ? `Beboer (kun kontekst): ${body.residentLabel}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const userMsg = extra ? `${extra}\n\n---\n\n${draft}` : draft;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[journal-polish] anthropic error:', res.status, err);
    return NextResponse.json({ error: 'AI svarer ikke — prøv igen' }, { status: 502 });
  }

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const block = data.content?.find((c) => c.type === 'text');
  const text = block?.text?.trim();

  if (!text) {
    return NextResponse.json({ error: 'Tomt svar fra AI' }, { status: 502 });
  }

  return NextResponse.json({ text });
}

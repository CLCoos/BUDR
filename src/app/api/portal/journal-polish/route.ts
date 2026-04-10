import { NextRequest, NextResponse } from 'next/server';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const maxDuration = 60;

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

  let body: { draft?: string; text?: string; category?: string; residentLabel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const draft = (body.draft ?? body.text ?? '').trim();
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

  const result = await callAnthropicJournalPolish({
    apiKey: key,
    system: SYSTEM,
    userMessage: userMsg,
    maxTokens: 1200,
  });

  if (!result.ok) {
    console.error(
      '[journal-polish] anthropic failed:',
      result.lastModel,
      result.status,
      result.body.slice(0, 500)
    );
    if (result.status === 401) {
      return NextResponse.json(
        { error: 'Ugyldig Anthropic API-nøgle på serveren' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'AI svarer ikke — prøv igen' }, { status: 502 });
  }

  return NextResponse.json({ text: result.text, polished: result.text });
}

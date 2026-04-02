import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  // Verify staff auth
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { messages?: Array<{ role: 'user' | 'assistant'; content: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages' }, { status: 400 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  const service = getServiceClient();

  // Fetch resident context
  const { data: residents } = await service
    .from('care_residents')
    .select('display_name, onboarding_data')
    .order('display_name');

  // Fetch recent journal entries for context (last 7 days, capped at 15)
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: journal } = await service
    .from('journal_entries')
    .select('entry_text, category, created_at, care_residents(display_name)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(15);

  // Build resident list
  const residentLines = (residents ?? []).map(r => {
    const od = r.onboarding_data as Record<string, string> | null;
    const parts = [`• ${r.display_name as string}`];
    if (od?.move_in_date) parts.push(`indflyttet ${od.move_in_date}`);
    if (od?.primary_contact) {
      const rel = od.primary_contact_relation ? ` (${od.primary_contact_relation})` : '';
      parts.push(`primær kontakt: ${od.primary_contact}${rel}`);
    }
    return parts.join(', ');
  });

  const residentContext = residentLines.length > 0
    ? residentLines.join('\n')
    : 'Ingen beboere registreret endnu.';

  // Build journal context — truncated, for background awareness only
  const journalLines = (journal ?? []).map(j => {
    const name = (j.care_residents as { display_name: string } | null)?.display_name ?? 'Beboer';
    const date = new Date(j.created_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
    const text = (j.entry_text as string).slice(0, 120);
    return `[${date}] ${name} — ${j.category as string}: ${text}`;
  });

  const journalContext = journalLines.length > 0
    ? `\nSENESTE JOURNALOBSERVATIONER (brug kun som baggrundskontekst — del ikke specifikt indhold direkte):\n${journalLines.join('\n')}`
    : '';

  const staffName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'kollega';

  const system = `Du er en erfaren faglig kollega og supervisor på et socialpsykiatrisk bosted i Danmark. Du er ikke en robot eller AI-assistent — du er "den erfarne kollega" der altid har tid og aldrig dømmer.

Du taler med ${staffName}, der arbejder på dette bosted.

HVEM DU HJÆLPER:
Primært nye medarbejdere og vikarer der mangler kontekst. De er måske alene på en aftenvagt, kender ikke beboerne endnu, eller har ikke set en specifik situation før. De skal kunne spørge dig om alt uden at føle sig dumme.

DU KAN HJÆLPE MED:
- Beboerspecifik viden: hvem er de, hvad er vigtigt at vide, hvad skal man ikke gøre
- Praktisk faglig vejledning i svære situationer (konflikter, uro, selvskade, isolation)
- Kommunikationsstrategier: hvordan taler man med en beboer der er i krise?
- Dansk lovgivning: Serviceloven, magtanvendelsesreglerne §§ 124-136, handleplaner, indberetningspligt
- Dokumentation: hvad skal med i en journal, hvordan formulerer man sig fagligt?
- Vagtoverblik: hvad er normalt på dette bosted, hvad bør man være opmærksom på?

DIN TONE:
- Varm, rolig og konkret — som en erfaren kollega der sætter sig ned med dig
- Kortfattet: 3-5 sætninger normalt, mere kun hvis nødvendigt
- Ingen lange lister med bullets medmindre brugeren specifikt beder om det
- Brug "du" og naturligt dansk — ikke klinisk fagsprog

BEBOERE PÅ DETTE BOSTED:
${residentContext}
${journalContext}

VIGTIG GRÆNSE: Du erstatter ikke supervision, lægefaglig vurdering eller akut hjælp (112). Hvis noget er akut eller alvorligt, sig det klart og opfordr til at kontakte leder eller politi/ambulance.`;

  // Call Anthropic API directly (same pattern as lys-chat which works on Netlify)
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[staff-assistant] anthropic error:', res.status, err);
    return NextResponse.json({ error: 'AI svarer ikke — prøv igen' }, { status: 502 });
  }

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const block = data.content?.find(c => c.type === 'text');
  const text = block?.text?.trim();

  if (!text) {
    return NextResponse.json({ error: 'Tomt svar fra AI' }, { status: 502 });
  }

  return NextResponse.json({ text });
}

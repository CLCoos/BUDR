import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseStaffOrgId } from '@/lib/staffOrgScope';

function copenhagenYmd(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

const SYSTEM = `Du er faglig konsulent på et dansk socialpsykiatrisk bosted. Personalet har skrevet flere korte, uformelle notater i løbet af dagen om samme beboer.

Din opgave er at samle dem til ÉT sammenhængende, professionelt journalnotat — som om det skrives om aftenen til dokumentation og overdragelse.

KRAV TIL OUTPUT:
- Svar KUN med det færdige notat — ingen hilsen, ingen forklaring, ingen anførselstegn om hele teksten.
- Brug PRÆCIS disse to overskrifter på hver sin linje: "Aktivitet/Handling" og "Refleksion".
- Aktivitet/Handling: objektiv sammenfatning af hvad der skete (kronologisk eller tematisk). Ingen opdigtede detaljer — kun det der fremgår af kilderne.
- Refleksion: samlet faglig vurdering og evt. næste skridt. Observerbart sprog.
- Fjern gentagelser og talesprog. Bevar konkrete facts (navne på aktiviteter, tidspunkter hvis nævnt).
- Mål ca. 200–450 ord afhængigt af hvor meget der er i kilderne.`;

/**
 * POST /api/portal/journal-day-synthesis
 * Body: { resident_id: string }
 * Samler dagens kladder (vis i dagbog) for beboeren til ét professionelt notat.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!orgId) {
    return NextResponse.json({ error: 'Organisation mangler' }, { status: 403 });
  }

  let body: { resident_id?: string };
  try {
    body = (await req.json()) as { resident_id?: string };
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const residentId = typeof body.resident_id === 'string' ? body.resident_id.trim() : '';
  if (!residentId) {
    return NextResponse.json({ error: 'Manglende resident_id' }, { status: 400 });
  }

  const { data: cr, error: crErr } = await supabase
    .from('care_residents')
    .select('user_id')
    .eq('user_id', residentId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (crErr || !cr) {
    return NextResponse.json({ error: 'Beboer ikke fundet eller ingen adgang' }, { status: 403 });
  }

  const todayYmd = copenhagenYmd(new Date());
  const since = new Date(Date.now() - 40 * 3600 * 1000).toISOString();

  const { data: raw, error: jErr } = await supabase
    .from('journal_entries')
    .select('id, staff_name, entry_text, category, created_at, journal_status, show_in_diary')
    .eq('resident_id', residentId)
    .eq('journal_status', 'kladde')
    .eq('show_in_diary', true)
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (jErr) {
    return NextResponse.json({ error: jErr.message }, { status: 500 });
  }

  const rows = (raw ?? []).filter(
    (r) => copenhagenYmd(new Date(r.created_at as string)) === todayYmd
  ) as {
    id: string;
    staff_name: string;
    entry_text: string;
    category: string;
    created_at: string;
  }[];

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'Ingen kladder med «Vis i dagbog» fra i dag til denne beboer' },
      { status: 400 }
    );
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  const lines = rows.map((r, i) => {
    const t = new Date(r.created_at).toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Copenhagen',
    });
    return `### Notat ${i + 1} (${t}, ${r.staff_name}, ${r.category})\n${r.entry_text.trim()}`;
  });

  const userMsg = lines.join('\n\n---\n\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2200,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[journal-day-synthesis] anthropic error:', res.status, err);
    return NextResponse.json({ error: 'AI svarer ikke — prøv igen' }, { status: 502 });
  }

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const block = data.content?.find((c) => c.type === 'text');
  const text = block?.text?.trim();

  if (!text) {
    return NextResponse.json({ error: 'Tomt svar fra AI' }, { status: 502 });
  }

  return NextResponse.json({ text, sourceCount: rows.length });
}

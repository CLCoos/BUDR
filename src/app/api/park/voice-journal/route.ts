import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const CATEGORY = 'Lys journal';

const PARK_SYSTEM_PROMPT =
  'Du er en faglig assistent på et socialpsykiatrisk bosted. Strukturér følgende beboerfortælling som et journalnotat efter PARK-metodikken med tre sektioner: S1 (fakta og ressourcer), S2 (tankemønstre og mestring), S3 (måltrappe og handlingsplan). Skriv i tredje person, fagligt men menneskeligt. Returnér kun journalteksten, ingen forklaring.';

type PostBody = { transcript?: string };

/**
 * POST /api/park/voice-journal
 *
 * Accepts a spoken transcript, formats it as a PARK-structured journal note
 * via the Anthropic API (claude-sonnet-4-5), and saves it to journal_entries
 * with journal_status: 'kladde' so staff can review and approve it.
 *
 * Auth: budr_resident_id cookie (service role for DB, same pattern as other
 * park routes). Does NOT use the resident's Supabase Auth session.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
  if (!transcript) {
    return NextResponse.json({ error: 'Ingen tale at behandle' }, { status: 400 });
  }
  if (transcript.length > 10_000) {
    return NextResponse.json({ error: 'Optagelsen er for lang' }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  // Confirm resident exists.
  const { data: resident, error: resErr } = await supabase
    .from('care_residents')
    .select('user_id, display_name')
    .eq('user_id', residentId)
    .maybeSingle();

  if (resErr) {
    return NextResponse.json({ error: resErr.message }, { status: 500 });
  }
  if (!resident) {
    return NextResponse.json({ error: 'Resident ikke fundet' }, { status: 401 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });
  }

  // Call Anthropic — direct fetch, same pattern as staff-assistant route.
  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      system: PARK_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    console.error('[voice-journal] anthropic error:', aiRes.status, errText);
    return NextResponse.json({ error: 'AI svarer ikke — prøv igen' }, { status: 502 });
  }

  const aiData = (await aiRes.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const aiContent = aiData.content?.find((c) => c.type === 'text')?.text?.trim();

  if (!aiContent) {
    return NextResponse.json({ error: 'Tomt svar fra AI' }, { status: 502 });
  }

  const staffName = `Beboer (Lys AI): ${(resident.display_name as string | null) ?? residentId}`;

  const { data: inserted, error: insertErr } = await supabase
    .from('journal_entries')
    .insert({
      resident_id: residentId,
      staff_id: null,
      staff_name: staffName,
      entry_text: aiContent,
      category: CATEGORY,
      journal_status: 'kladde',
      approved_at: null,
      approved_by: null,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('[voice-journal] insert error:', insertErr.message);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    entry_id: (inserted as { id: string }).id,
    content: aiContent,
  });
}

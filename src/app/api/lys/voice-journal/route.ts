// BUDR — API Route: Voice Journal med split-output
// Genererer parallelt: (1) fagligt CHIME-struktureret journalnotat (til staff),
// (2) bevaret recovery story i borgerens egne ord (kræver borger-godkendelse før staff ser den).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const CATEGORY = 'Lys journal';

const VOICE_JOURNAL_SYSTEM = `Du er en faglig assistent på et socialpsykiatrisk bosted i Danmark.

Din opgave er at producere TO outputs fra en beboers talte fortælling — i samme svar, som JSON.

OUTPUT 1 — CHIME-struktureret journalnotat:
Strukturér beboerens fortælling som et fagligt journalnotat med fem sektioner. Skriv i tredje person, fagligt men menneskeligt. Brug recovery-orienteret sprog. Ingen kognitiv-terapeutiske begreber.

Sektionerne er:
- Forbundethed: hvem talte beboeren om, hvem var støtte, hvor følte de tilhør
- Håb: drømme, ønsker, ting beboeren ser frem til
- Identitet: styrker, stoltheder, det beboeren er god til, det de kan lide
- Mening: værdier, hvad der betyder noget, formål
- Handlekraft: beslutninger beboeren har taget, ting de selv har klaret

Hvis en sektion ikke har indhold fra fortællingen, skriv "Ikke nævnt i denne fortælling."

OUTPUT 2 — Bevaret recovery story:
Bevar beboerens egne ord. Du må KUN:
- Fjerne udfyldningsord ("øh", "altså", "ligesom")
- Rette åbenlyse transkriptionsfejl
- Ordne i sætninger med tegnsætning
- Bevare beboerens stemme, ordvalg, syntaks

Du må IKKE:
- Omformulere
- Strukturere efter temaer
- Tilføje ord beboeren ikke sagde
- Ændre stemme fra første person

Returner KUN dette JSON-format, intet andet:
{
  "journal_note": "Det fagligt strukturerede CHIME-notat i tredje person, max 400 ord",
  "recovery_story": "Beboerens bevarede fortælling i første person, let renset"
}`;

interface PostBody {
  transcript?: string;
}

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

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });
  }

  // Kald Anthropic FØR vi rør databasen — så vi ikke gemmer halv-data hvis AI fejler
  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: VOICE_JOURNAL_SYSTEM,
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
  const aiText = aiData.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
  const cleaned = aiText.replace(/^```json\s*|\s*```$/g, '').trim();

  let parsed: { journal_note: string; recovery_story: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'AI returnerede ugyldigt format' }, { status: 502 });
  }

  if (!parsed.journal_note || !parsed.recovery_story) {
    return NextResponse.json({ error: 'AI returnerede ufuldstændigt svar' }, { status: 502 });
  }

  // Demo-session: returner AI-svaret men gem ikke i DB
  if (!isUuid(residentId)) {
    return NextResponse.json({
      journal_note: parsed.journal_note,
      recovery_story: parsed.recovery_story,
      demo: true,
    });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { data: resident, error: resErr } = await supabase
    .from('care_residents')
    .select('user_id, display_name, org_id')
    .eq('user_id', residentId)
    .maybeSingle();

  if (resErr) return NextResponse.json({ error: resErr.message }, { status: 500 });
  if (!resident) return NextResponse.json({ error: 'Resident ikke fundet' }, { status: 401 });

  const orgId = (resident as { org_id?: string | null }).org_id ?? null;
  const staffName = `Beboer (Lys AI): ${(resident.display_name as string | null) ?? residentId}`;

  // 1) Indsæt journal entry (faglig version, synlig for staff)
  const { data: journalEntry, error: journalErr } = await supabase
    .from('journal_entries')
    .insert({
      resident_id: residentId,
      staff_id: null,
      staff_name: staffName,
      entry_text: parsed.journal_note,
      category: CATEGORY,
      org_id: orgId,
    })
    .select('id')
    .single();

  if (journalErr) {
    console.error('[voice-journal] journal insert error:', journalErr.message);
    return NextResponse.json({ error: journalErr.message }, { status: 500 });
  }

  const journalId = (journalEntry as { id: string }).id;

  // 2) Indsæt recovery story knyttet til journalen (kræver borger-godkendelse før staff ser cleaned_story)
  const { data: story, error: storyErr } = await supabase
    .from('lys_recovery_stories')
    .insert({
      resident_id: residentId,
      org_id: orgId,
      related_journal_entry_id: journalId,
      raw_transcript: transcript,
      cleaned_story: parsed.recovery_story,
      resident_approved: false,
    })
    .select('id')
    .single();

  if (storyErr) {
    console.error('[voice-journal] story insert error:', storyErr.message);
    // Ikke fatal — journalen er gemt. Vi returnerer stadig success men uden story_id.
  }

  // Audit log
  try {
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'resident',
      p_action: 'journal.entry_created',
      p_actor_id: residentId,
      p_actor_org_id: orgId,
      p_target_table: 'journal_entries',
      p_target_id: journalId,
      p_metadata: {
        source: 'voice-journal',
        mode: 'voice',
        has_recovery_story: !!story,
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({
    entry_id: journalId,
    story_id: (story as { id: string } | null)?.id ?? null,
    journal_note: parsed.journal_note,
    recovery_story: parsed.recovery_story,
  });
}

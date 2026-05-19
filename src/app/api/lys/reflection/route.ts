// BUDR — API Route: Recovery-refleksion
// Erstatter den gamle counter-thought-funktion.
// Hjælper borgeren med at finde styrke i situationen — ikke at "udfordre tanker".
// Recovery-orienteret praksis: vi spejler, fortolker ikke.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import type { ChimeDomain } from '@/types/lys';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const REFLECTION_SYSTEM = `Du er Lys — en varm, recovery-orienteret AI-følgesvend i BUDR-appen for borgere på socialpsykiatriske bosteder i Danmark.

Din opgave: Hjælp borgeren med at finde HVAD der gav styrke i en situation — ikke at "udfordre tanker".

Du arbejder IKKE med kognitiv terapi. Du foreslår ALDRIG modtanker. Du udfordrer ALDRIG borgerens oplevelse.

I stedet leder du efter:
- Hvad gjorde borgeren godt i situationen?
- Hvilke ressourcer brugte de?
- Hvem eller hvad gav støtte?
- Hvad er ét lille, konkret næste skridt borgeren kunne tage?

Regler:
- Skriv på dansk, enkelt og varmt
- Max 3-4 korte sætninger pr. felt
- Vær anerkendende, ikke afvisende
- Ingen belærende tone
- Det næste skridt skal være lille, konkret og borger-formet — aldrig en moralsk anvisning
- Returner KUN gyldig JSON i det format der er specificeret`;

interface ReflectionRequest {
  situation?: string;
  what_was_hard?: string;
  feeling?: string;
  feeling_score?: number;
}

interface ReflectionAiResponse {
  acknowledgment: string;
  strength_observed: string;
  next_step_suggestion: string;
  primary_chime_domain: ChimeDomain;
}

const VALID_DOMAINS: ChimeDomain[] = [
  'connectedness',
  'hope',
  'identity',
  'meaning',
  'empowerment',
];

export async function POST(req: NextRequest): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ReflectionRequest;
  try {
    body = (await req.json()) as ReflectionRequest;
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const situation = typeof body.situation === 'string' ? body.situation.trim() : '';
  if (!situation) {
    return NextResponse.json({ error: 'Mangler situation' }, { status: 400 });
  }

  const whatWasHard = typeof body.what_was_hard === 'string' ? body.what_was_hard.trim() : '';
  const feeling = typeof body.feeling === 'string' ? body.feeling.trim() : '';
  const feelingScore =
    typeof body.feeling_score === 'number' && body.feeling_score >= 1 && body.feeling_score <= 10
      ? body.feeling_score
      : null;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });
  }

  const userPrompt = `Borgeren har fortalt om en situation. Hjælp dem med at se hvad der gav styrke, og foreslå ét lille konkret næste skridt.

Situation: ${situation}
${whatWasHard ? `Hvad var svært: ${whatWasHard}` : ''}
${feeling ? `Følelse: ${feeling}` : ''}

Svar i præcis dette JSON-format:
{
  "acknowledgment": "En kort anerkendelse af det svære (1-2 sætninger, varm tone)",
  "strength_observed": "Hvad du ser borgeren gjorde godt eller hvilken ressource de brugte (1-2 sætninger)",
  "next_step_suggestion": "Ét lille, konkret, borger-formet næste skridt (1 sætning, ikke moralsk, ikke direktiv)",
  "primary_chime_domain": "Ét af: connectedness, hope, identity, meaning, empowerment"
}

Returner KUN JSON, ingen anden tekst.`;

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: REFLECTION_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    console.error('[reflection] anthropic error:', aiRes.status, errText);
    return NextResponse.json({ error: 'AI svarer ikke — prøv igen' }, { status: 502 });
  }

  const aiData = (await aiRes.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const aiText = aiData.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
  const cleaned = aiText.replace(/^```json\s*|\s*```$/g, '').trim();

  let parsed: ReflectionAiResponse;
  try {
    parsed = JSON.parse(cleaned) as ReflectionAiResponse;
  } catch {
    // Fallback hvis AI ikke returnerer gyldig JSON
    parsed = {
      acknowledgment: 'Det lyder som om der har været svært.',
      strength_observed: 'At du sætter ord på det er allerede et stærkt skridt.',
      next_step_suggestion: 'Tag det stille resten af dagen og mærk efter, hvad du har brug for.',
      primary_chime_domain: 'identity',
    };
  }

  // Valider primary_chime_domain — fald tilbage til 'identity' hvis ugyldig
  const chimeDomain: ChimeDomain = VALID_DOMAINS.includes(parsed.primary_chime_domain)
    ? parsed.primary_chime_domain
    : 'identity';

  // Demo-session: returner AI-svaret men gem ikke i DB (ikke-UUID resident_id)
  if (!isUuid(residentId)) {
    return NextResponse.json({
      acknowledgment: parsed.acknowledgment,
      strength_observed: parsed.strength_observed,
      next_step_suggestion: parsed.next_step_suggestion,
      primary_chime_domain: chimeDomain,
      demo: true,
    });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  // Hent org_id for indsættelse i lys_reflection
  const { data: resident, error: resErr } = await supabase
    .from('care_residents')
    .select('user_id, org_id')
    .eq('user_id', residentId)
    .maybeSingle();

  if (resErr) {
    return NextResponse.json({ error: resErr.message }, { status: 500 });
  }
  if (!resident) {
    return NextResponse.json({ error: 'Resident ikke fundet' }, { status: 401 });
  }

  const orgId = (resident as { org_id?: string | null }).org_id ?? null;

  const { data: inserted, error: insertErr } = await supabase
    .from('lys_reflection')
    .insert({
      resident_id: residentId,
      org_id: orgId,
      situation,
      what_was_hard: whatWasHard || null,
      what_gave_strength: parsed.strength_observed,
      ai_suggested_next_step: parsed.next_step_suggestion,
      resident_chosen_step: null,
      feeling: feeling || null,
      feeling_score: feelingScore,
      primary_chime_domain: chimeDomain,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('[reflection] insert error:', insertErr.message);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  try {
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'resident',
      p_action: 'reflection.created',
      p_actor_id: residentId,
      p_actor_org_id: orgId,
      p_target_table: 'lys_reflection',
      p_target_id: (inserted as { id: string }).id,
      p_metadata: {
        primary_chime_domain: chimeDomain,
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({
    reflection_id: (inserted as { id: string }).id,
    acknowledgment: parsed.acknowledgment,
    strength_observed: parsed.strength_observed,
    next_step_suggestion: parsed.next_step_suggestion,
    primary_chime_domain: chimeDomain,
  });
}

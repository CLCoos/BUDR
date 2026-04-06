import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export type PlanItem = {
  id: string;
  time: string;
  title: string;
  description?: string;
  category: 'mad' | 'medicin' | 'aktivitet' | 'hvile' | 'social';
};

const SYSTEM_PROMPT =
  'Du er en hjælpsom AI-assistent i Lys-appen for borgere på et socialpsykiatrisk bosted. ' +
  'Borgeren beder om en ændring til sin dagsplan. ' +
  'Foreslå en revideret plan baseret på borgerens ønske. ' +
  'Vær imødekommende og realistisk. ' +
  'Returner KUN gyldig JSON uden markdown-blokke: ' +
  '{ "proposed_items": [{"id": "...", "time": "HH:MM", "title": "...", "description": "...", "category": "mad|medicin|aktivitet|hvile|social"}], "ai_reasoning": "..." }';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Database ikke konfigureret' }, { status: 503 });
  }

  let body: { residentId?: string; userMessage?: string; currentPlan?: PlanItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const { residentId, userMessage, currentPlan } = body;
  if (!residentId || !userMessage?.trim()) {
    return NextResponse.json({ error: 'Mangler påkrævede felter' }, { status: 400 });
  }

  const userContent =
    `Nuværende dagsplan:\n${JSON.stringify(currentPlan ?? [], null, 2)}\n\n` +
    `Borgerens ønske: ${userMessage.trim()}`;

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    console.error('propose-plan anthropic error', aiRes.status, errText);
    return NextResponse.json({ error: 'AI-tjenesten svarede ikke' }, { status: 502 });
  }

  const aiData = (await aiRes.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const rawText = aiData.content?.find(c => c.type === 'text')?.text?.trim() ?? '';

  let parsed: { proposed_items: PlanItem[]; ai_reasoning: string };
  try {
    // Strip optional markdown code fences if present
    const jsonStr = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('propose-plan parse error', rawText);
    return NextResponse.json({ error: 'Kunne ikke forstå AI-svaret' }, { status: 502 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } },
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data: proposal, error: dbError } = await supabase
    .from('plan_proposals')
    .insert({
      resident_id: residentId,
      plan_date: today,
      user_message: userMessage.trim(),
      proposed_items: parsed.proposed_items,
      ai_reasoning: parsed.ai_reasoning,
      status: 'pending',
    })
    .select('id')
    .single();

  if (dbError) {
    console.error('propose-plan db error', dbError);
    return NextResponse.json({ error: 'Kunne ikke gemme forslaget' }, { status: 500 });
  }

  return NextResponse.json({
    proposalId: proposal.id as string,
    proposed_items: parsed.proposed_items,
    ai_reasoning: parsed.ai_reasoning,
  });
}

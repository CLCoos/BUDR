import { NextRequest, NextResponse } from 'next/server';
import { getStaffPermissions } from '@/lib/auth/getStaffPermissions';
import { hasPermission } from '@/lib/auth/hasPermission';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { PERMISSIONS } from '@/lib/permissions';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseStaffOrgId } from '@/lib/staffOrgScope';

export const maxDuration = 60;

const SYSTEM = `Du er en erfaren kontaktpædagog der skriver et kort overblik til en 
travl kollega på et dansk socialpsykiatrisk bosted. Kollegaen skal kunne skanne det 
på 10 sekunder.

Du får en beboers seneste check-ins (humør 1-10, trafiklys, fritekst) og personalets 
journalnotater. Find ÉT konkret, brugbart mønster og beskriv det.

Svar KUN med gyldig JSON, intet andet, ingen markdown, ingen kodeblokke:
{
  "lead": "Højst 2 korte sætninger. Det vigtigste mønster lige nu, i klart hverdagssprog.",
  "bullets": ["2-4 korte observationer. Hver med konkret dato og hvad der skete."],
  "actions": [{"label": "Kort handling, max 6 ord", "sectionId": "indtjek"}]
}

SPROGKRAV (vigtigt):
- Skriv naturligt, fagligt dansk. Brug altid æ, ø, å.
- Brug beboerens navn (fx "Sara"), aldrig "mødrenes", "vedkommende" eller kringlede former.
- ALDRIG orddeling med bindestreg midt i et ord ( skriv "mønster", ikke "møn-ster").
- Forbudte ord: "korrelerer", "signalerer", "indikerer", "gensignaliserer". 
  Skriv som et menneske taler.
- Korte sætninger. Ingen fyld. Ingen indledning som "Det ses at" eller "Data viser".

INDHOLDSKRAV:
- Brug kun det der står i dataene. Opdigt aldrig begivenheder, tal eller datoer.
- Observerbart sprog. Ingen diagnoser, ingen vurdering af årsag som faktum 
  (skriv "ser ud til" / "ofte", ikke påstande).
- actions: korte handlingsforslag, IKKE hele spørgsmål. Max 6 ord pr. label.
- sectionId skal være én af: 'indtjek', 'journal', 'borgerapp'.
- Hvis der ikke er nok data til et mønster: lead forklarer det kort, bullets [], actions [].`;

function copenhagenYmd(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function windowDays(briefType: 'daily' | 'weekly'): number {
  return briefType === 'weekly' ? 28 : 7;
}

function stripJsonFences(raw: string): string {
  let t = raw.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  return t;
}

type BriefPayload = {
  lead: string;
  bullets: unknown[];
  actions: unknown[];
};

function parseBriefJson(text: string): BriefPayload | null {
  try {
    const parsed = JSON.parse(stripJsonFences(text)) as Record<string, unknown>;
    if (typeof parsed.lead !== 'string') return null;
    if (!Array.isArray(parsed.bullets)) return null;
    if (!Array.isArray(parsed.actions)) return null;
    return {
      lead: parsed.lead.trim(),
      bullets: parsed.bullets,
      actions: parsed.actions,
    };
  } catch {
    return null;
  }
}

type LysCheckinRow = {
  created_at: string;
  mood_score: number;
  mood_label: string | null;
  traffic_light: string | null;
  free_text: string | null;
};

type JournalRow = {
  created_at: string;
  entry_text: string;
  category: string;
};

function formatCheckinLine(r: LysCheckinRow): string {
  const d = copenhagenYmd(new Date(r.created_at));
  const parts = [`${d}`, `humør ${r.mood_score}`];
  if (r.mood_label?.trim()) parts.push(`(${r.mood_label.trim()})`);
  if (r.traffic_light) parts.push(`trafiklys: ${r.traffic_light}`);
  if (r.free_text?.trim()) parts.push(`fritekst: ${r.free_text.trim()}`);
  return `- ${parts.join(', ')}`;
}

function formatJournalLine(r: JournalRow): string {
  const d = copenhagenYmd(new Date(r.created_at));
  return `- ${d}, ${r.category}: ${r.entry_text.trim()}`;
}

/**
 * POST /api/portal/generate-brief
 * Body: { resident_id: string, brief_type?: 'daily' | 'weekly' }
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const permissions = await getStaffPermissions(supabase);
  if (!hasPermission(permissions, PERMISSIONS.VIEW_360)) {
    return NextResponse.json({ error: 'Ingen adgang' }, { status: 403 });
  }

  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!orgId) {
    return NextResponse.json({ error: 'Organisation mangler' }, { status: 403 });
  }

  let body: { resident_id?: string; brief_type?: string };
  try {
    body = (await req.json()) as { resident_id?: string; brief_type?: string };
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const residentId = typeof body.resident_id === 'string' ? body.resident_id.trim() : '';
  if (!residentId) {
    return NextResponse.json({ error: 'Manglende resident_id' }, { status: 400 });
  }

  const briefType: 'daily' | 'weekly' = body.brief_type === 'weekly' ? 'weekly' : 'daily';
  const days = windowDays(briefType);

  const { data: cr, error: crErr } = await supabase
    .from('care_residents')
    .select('user_id, org_id, first_name, display_name')
    .eq('user_id', residentId)
    .maybeSingle();

  if (crErr) {
    console.error('[generate-brief] care_residents:', crErr.message);
    return NextResponse.json({ error: 'Kunne ikke hente beboer' }, { status: 500 });
  }
  if (!cr) {
    return NextResponse.json({ error: 'Beboer ikke fundet' }, { status: 404 });
  }
  if (cr.org_id !== orgId) {
    return NextResponse.json({ error: 'Ingen adgang til beboer' }, { status: 403 });
  }

  const now = new Date();
  const windowEndYmd = copenhagenYmd(now);
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const windowStartYmd = copenhagenYmd(windowStart);
  const sinceIso = windowStart.toISOString();

  const residentLabel =
    (typeof cr.display_name === 'string' && cr.display_name.trim()) ||
    (typeof cr.first_name === 'string' && cr.first_name.trim()) ||
    'Beboer';

  const { data: checkins, error: checkinErr } = await supabase
    .from('lys_checkin')
    .select('created_at, mood_score, mood_label, traffic_light, free_text')
    .eq('resident_id', residentId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true });

  if (checkinErr) {
    console.error('[generate-brief] lys_checkin:', checkinErr.message);
    return NextResponse.json({ error: 'Kunne ikke hente check-ins' }, { status: 500 });
  }

  const { data: journalRows, error: journalErr } = await supabase
    .from('journal_entries')
    .select('created_at, entry_text, category')
    .eq('resident_id', residentId)
    .eq('org_id', orgId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true });

  if (journalErr) {
    console.error('[generate-brief] journal_entries:', journalErr.message);
    return NextResponse.json({ error: 'Kunne ikke hente journal' }, { status: 500 });
  }

  const checkinList = (checkins ?? []) as LysCheckinRow[];
  const journalList = (journalRows ?? []) as JournalRow[];

  if (checkinList.length === 0 && journalList.length === 0) {
    return NextResponse.json({ error: 'ikke_nok_data' }, { status: 200 });
  }

  const checkinBlock =
    checkinList.length > 0
      ? checkinList.map(formatCheckinLine).join('\n')
      : '(ingen check-ins i perioden)';
  const journalBlock =
    journalList.length > 0
      ? journalList.map(formatJournalLine).join('\n')
      : '(ingen journalnotater i perioden)';

  const userMessage = `Beboer: ${residentLabel}
Vindue: ${windowStartYmd} – ${windowEndYmd} (${briefType === 'weekly' ? '28' : '7'} dage)

Check-ins:
${checkinBlock}

Journalnotater:
${journalBlock}`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  const ai = await callAnthropicJournalPolish({
    apiKey,
    system: SYSTEM,
    userMessage,
    maxTokens: 1024,
  });

  if (!ai.ok) {
    console.error(
      '[generate-brief] anthropic:',
      ai.lastModel,
      ai.status,
      ai.body.slice(0, 400)
    );
    return NextResponse.json({ error: 'ai_fejl' }, { status: 502 });
  }

  const parsed = parseBriefJson(ai.text);
  if (!parsed) {
    console.error('[generate-brief] parse:', ai.text.slice(0, 400));
    return NextResponse.json({ error: 'parse_fejl' }, { status: 502 });
  }

  const { data: saved, error: insertErr } = await supabase
    .from('ai_briefs')
    .insert({
      resident_id: residentId,
      org_id: orgId,
      brief_type: briefType,
      lead: parsed.lead,
      bullets: parsed.bullets,
      actions: parsed.actions,
      source_window_start: windowStartYmd,
      source_window_end: windowEndYmd,
      model: 'claude-haiku-4-5-20251001',
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[generate-brief] ai_briefs insert:', insertErr.message);
    return NextResponse.json({ error: 'Kunne ikke gemme brief' }, { status: 500 });
  }

  return NextResponse.json(saved, { status: 200 });
}

import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { journalQueryMissingColumn } from '@/lib/journalEntriesQueryCompat';
import type { SupabaseClient } from '@supabase/supabase-js';

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
    t = t
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
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

export type GenerateBriefOutcome =
  | { status: 'ok'; brief: Record<string, unknown> }
  | { status: 'no_data' }
  | { status: 'not_configured' }
  | { status: 'ai_error' }
  | { status: 'parse_error' }
  | { status: 'db_error'; message: string };

export async function generateBriefForResident(args: {
  supabase: SupabaseClient;
  residentId: string;
  orgId: string;
  residentLabel: string;
  briefType: 'daily' | 'weekly';
}): Promise<GenerateBriefOutcome> {
  const { supabase, residentId, orgId, residentLabel, briefType } = args;
  const days = windowDays(briefType);

  const now = new Date();
  const windowEndYmd = copenhagenYmd(now);
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const windowStartYmd = copenhagenYmd(windowStart);
  const sinceIso = windowStart.toISOString();

  const { data: checkins, error: checkinErr } = await supabase
    .from('lys_checkin')
    .select('created_at, mood_score, mood_label, traffic_light, free_text')
    .eq('resident_id', residentId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true });

  if (checkinErr) {
    return { status: 'db_error', message: checkinErr.message };
  }

  let { data: journalRows, error: journalErr } = await supabase
    .from('journal_entries')
    .select('created_at, entry_text, category')
    .eq('resident_id', residentId)
    .eq('org_id', orgId)
    .eq('journal_status', 'godkendt')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true });

  // Older installations may predate journal_status. In those schemas every row
  // is legacy-approved because the draft workflow did not exist yet.
  if (journalErr && journalQueryMissingColumn(journalErr.message, 'journal_status')) {
    const legacyResult = await supabase
      .from('journal_entries')
      .select('created_at, entry_text, category')
      .eq('resident_id', residentId)
      .eq('org_id', orgId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true });
    journalRows = legacyResult.data;
    journalErr = legacyResult.error;
  }

  if (journalErr) {
    return { status: 'db_error', message: journalErr.message };
  }

  const checkinList = (checkins ?? []) as LysCheckinRow[];
  const journalList = (journalRows ?? []) as JournalRow[];

  if (checkinList.length === 0 && journalList.length === 0) {
    return { status: 'no_data' };
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
  if (!apiKey) return { status: 'not_configured' };

  const ai = await callAnthropicJournalPolish({
    apiKey,
    system: SYSTEM,
    userMessage,
    maxTokens: 1024,
  });

  if (!ai.ok) {
    return { status: 'ai_error' };
  }

  const parsed = parseBriefJson(ai.text);
  if (!parsed) {
    return { status: 'parse_error' };
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
    return { status: 'db_error', message: insertErr.message };
  }

  return { status: 'ok', brief: saved as Record<string, unknown> };
}

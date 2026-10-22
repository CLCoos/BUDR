import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import type { SupabaseClient } from '@supabase/supabase-js';
import { claudeApiKey } from '@/lib/ai/claudeTransport';
import { residentAliasMap } from '@/lib/ai/aliases';
import { medGrundlag } from '@/lib/ai/faglighed/grundlag';
import type { ResidentNameRow } from '@/lib/assistant/names';

const SYSTEM =
  medGrundlag(`Du skriver et kort overblik over én borger til en travl kollega på et socialpsykiatrisk bosted. Kollegaen skal kunne læse det på 10 sekunder.

Du får borgerens seneste check-ins i Lys (humør 1-10, trafiklys, egne ord) og personalets godkendte journalnotater. Find det vigtigste mønster lige nu, hvis der er et.

Svar KUN med gyldig JSON, ingen markdown og ingen kodeblokke:
{
  "lead": "Højst 2 korte sætninger: det vigtigste lige nu, i klart hverdagssprog.",
  "bullets": ["2-4 korte observationer, hver med dato og hvad der skete."],
  "actions": [{"label": "Kort handling, højst 6 ord", "sectionId": "indtjek"}]
}

Regler:
- Kald borgeren "Borgeren" eller brug initialerne fra data. Ingen navne.
- Et mønster kræver mindst to datapunkter, der peger samme vej. Ellers beskriver du kun det, der står.
- Har borgeren skrevet noget i et check-in, så brug borgerens egne ord i anførselstegn.
- Skriv tal og hyppighed præcist, som de står (fx "humør 3 den 12. og 4 den 14."), ikke "hver dag" eller "altid".
- Forbudte ord: "korrelerer", "signalerer", "indikerer". Ingen indledninger som "Det ses at" eller "Data viser".
- Ingen orddeling med bindestreg midt i ord.
- Har borgeren skrevet noget om selvskade, selvmordstanker eller vold, så står det i lead med borgerens egne ord.
- actions: korte handlingsforslag, ikke spørgsmål. sectionId er én af 'indtjek', 'journal', 'borgerapp'.
- Er der ikke nok data til et mønster, så siger lead det kort, og bullets og actions er [].`);

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

export type LysCheckinRow = {
  created_at: string;
  mood_score: number;
  mood_label: string | null;
  traffic_light: string | null;
  free_text: string | null;
};

export type JournalRow = {
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

export type BriefInput = {
  resident: ResidentNameRow;
  briefType: 'daily' | 'weekly';
  windowStartYmd: string;
  windowEndYmd: string;
  checkins: LysCheckinRow[];
  journal: JournalRow[];
};

/** Systeminstruks og besked til overblikket. AI'en ser "Borger 1"; svaret får initialerne. */
export function buildBriefRequest(input: BriefInput) {
  const aliases = residentAliasMap([input.resident]);
  const checkinBlock =
    input.checkins.length > 0
      ? input.checkins.map(formatCheckinLine).join('\n')
      : '(ingen check-ins i perioden)';
  const journalBlock =
    input.journal.length > 0
      ? input.journal.map(formatJournalLine).join('\n')
      : '(ingen journalnotater i perioden)';
  const userMessage = aliases.hide(`Borger: ${aliases.alias(0)}
Vindue: ${input.windowStartYmd} – ${input.windowEndYmd} (${input.briefType === 'weekly' ? '28' : '7'} dage)

Check-ins:
${checkinBlock}

Journalnotater:
${journalBlock}`);
  return {
    request: { system: SYSTEM, userMessage, maxTokens: 1024, temperature: 0.2 },
    restore: aliases.restore,
  };
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
  /** Borgerens navne: de skjules for AI'en, og overblikket bruger initialerne. */
  resident: ResidentNameRow;
  briefType: 'daily' | 'weekly';
}): Promise<GenerateBriefOutcome> {
  const { supabase, residentId, orgId, resident, briefType } = args;
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

  const { data: journalRows, error: journalErr } = await supabase
    .from('journal_entries')
    .select('created_at, entry_text, category')
    .eq('resident_id', residentId)
    .eq('org_id', orgId)
    // Kun godkendte notater: aldrig kladder eller borgerens private noter til AI.
    .eq('journal_status', 'godkendt')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true });

  if (journalErr) {
    return { status: 'db_error', message: journalErr.message };
  }

  const checkinList = (checkins ?? []) as LysCheckinRow[];
  const journalList = (journalRows ?? []) as JournalRow[];

  if (checkinList.length === 0 && journalList.length === 0) {
    return { status: 'no_data' };
  }

  const request = buildBriefRequest({
    resident,
    briefType,
    windowStartYmd,
    windowEndYmd,
    checkins: checkinList,
    journal: journalList,
  });

  const apiKey = claudeApiKey();
  if (!apiKey) return { status: 'not_configured' };

  const ai = await callAnthropicJournalPolish({ apiKey, ...request.request });

  if (!ai.ok) {
    return { status: 'ai_error' };
  }

  const parsed = parseBriefJson(request.restore(ai.text));
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

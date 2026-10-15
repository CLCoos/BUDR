import { NextRequest, NextResponse } from 'next/server';
import {
  appointmentFollowUps,
  documentDeadlines,
  fagsystemReminders,
  trafficLightStreaks,
  type CheckinRow,
  type ContactRow,
  type DocumentRow,
  type GeneratorResident,
  type JournalRow,
  type PlannerRow,
  type SuggestionInsert,
  type TransferNoteRow,
} from '@/lib/assistant/generators';
import { copenhagenStartOfDateUtcIso, copenhagenYmd } from '@/lib/copenhagenDay';
import { shiftYmd } from '@/lib/assistant/actions';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/**
 * POST /api/cron/assistant-suggestions — kaldes hver halve time af
 * netlify/functions/assistant-suggestions.mts.
 *
 * Laver assistentens forslag: opfølgning efter lægeaftaler, dokumentfrister og trafiklys flere
 * dage i træk, og en påmindelse om notater der ikke er overført til fagsystemet. Hvert forslag har en dedupe-nøgle, så det samme aldrig foreslås to gange. Gamle
 * åbne forslag udløber. Intet i borgerens data ændres her; det sker først, når nogen godkender.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET mangler' }, { status: 503 });
  if (req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date();
  const today = copenhagenYmd(now);
  const fail = (what: string, message: string) => {
    console.error(`[cron assistant-suggestions] ${what}:`, message);
    return NextResponse.json({ error: `Kunne ikke hente ${what}` }, { status: 500 });
  };

  const expired = await supabase
    .from('assistant_suggestions')
    .update({ status: 'udloebet' })
    .eq('status', 'aaben')
    .lt('expires_at', now.toISOString())
    .select('id');
  if (expired.error) return fail('forslag', expired.error.message);

  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const [residentsRes, contactsRes, plannerRes, journalRes, docsRes, checkinRes] =
    await Promise.all([
      supabase
        .from('care_residents')
        .select('user_id, org_id, first_name, last_name, display_name, nickname')
        .not('org_id', 'is', null),
      supabase.from('resident_contacts').select('resident_id, staff_id'),
      supabase
        .from('care_planner_entries')
        .select('id, org_id, resident_user_id, title, category, starts_at, ends_at, location')
        .not('resident_user_id', 'is', null)
        .gte('starts_at', dayAgo)
        .lte('starts_at', now.toISOString()),
      supabase
        .from('journal_entries')
        .select('resident_id, category, created_at')
        .eq('category', 'Sundhed')
        .gte('created_at', dayAgo),
      supabase
        .from('resident_documents')
        .select('id, org_id, resident_id, doc_type, title, status, due_date, responsible_id')
        .in('status', ['kladde', 'til_godkendelse'])
        .not('due_date', 'is', null)
        .lte('due_date', shiftYmd(today, 7)),
      supabase
        .from('lys_checkin')
        .select('resident_id, created_at, traffic_light')
        .not('traffic_light', 'is', null)
        .gte('created_at', copenhagenStartOfDateUtcIso(shiftYmd(today, -6))),
    ]);
  if (residentsRes.error) return fail('borgere', residentsRes.error.message);
  if (contactsRes.error) return fail('kontaktpersoner', contactsRes.error.message);
  if (plannerRes.error) return fail('kalender', plannerRes.error.message);
  if (journalRes.error) return fail('journal', journalRes.error.message);
  if (docsRes.error) return fail('dokumenter', docsRes.error.message);
  if (checkinRes.error) return fail('check-ins', checkinRes.error.message);

  const residents = (residentsRes.data ?? []) as GeneratorResident[];
  const contacts = (contactsRes.data ?? []) as ContactRow[];
  const candidates: SuggestionInsert[] = [
    ...appointmentFollowUps({
      now,
      residents,
      contacts,
      planner: (plannerRes.data ?? []) as PlannerRow[],
      journal: (journalRes.data ?? []) as JournalRow[],
    }),
    ...documentDeadlines({ now, residents, documents: (docsRes.data ?? []) as DocumentRow[] }),
    ...trafficLightStreaks({
      now,
      residents,
      contacts,
      checkins: (checkinRes.data ?? []) as CheckinRow[],
    }),
  ];

  candidates.push(...(await fagsystemCandidates(supabase, now)));

  let created = 0;
  if (candidates.length > 0) {
    const keys = [...new Set(candidates.map((c) => c.dedupe_key))];
    const { data: existing, error: existingErr } = await supabase
      .from('assistant_suggestions')
      .select('org_id, dedupe_key')
      .in('dedupe_key', keys);
    if (existingErr) return fail('forslag', existingErr.message);
    const seen = new Set((existing ?? []).map((e) => `${e.org_id}|${e.dedupe_key}`));
    const fresh = candidates.filter((c) => {
      const k = `${c.org_id}|${c.dedupe_key}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    for (const row of fresh) {
      const { error } = await supabase.from('assistant_suggestions').insert(row);
      // 23505: et parallelt kald nåede først; det er fint.
      if (error && error.code !== '23505') {
        console.error('[cron assistant-suggestions] insert:', error.message);
      } else if (!error) {
        created += 1;
      }
    }
  }

  return NextResponse.json({ created, expired: expired.data?.length ?? 0 });
}

/**
 * Notater fra de seneste 7 dage, der ikke er overført til fagsystemet. Mangler tabellen (før
 * migrationen er kørt), springes påmindelsen bare over.
 */
async function fagsystemCandidates(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  now: Date
): Promise<SuggestionInsert[]> {
  const missing = (code?: string) => code === 'PGRST205' || code === '42P01';
  const orgsRes = await supabase.from('journal_fagsystem_transfers').select('org_id').limit(1000);
  if (orgsRes.error) {
    if (!missing(orgsRes.error.code)) {
      console.error('[cron assistant-suggestions] fagsystem:', orgsRes.error.message);
    }
    return [];
  }
  const activeOrgs = new Set((orgsRes.data ?? []).map((r) => r.org_id as string));
  if (activeOrgs.size === 0) return [];

  const since = copenhagenStartOfDateUtcIso(shiftYmd(copenhagenYmd(now), -7));
  const notesRes = await supabase
    .from('journal_entries')
    .select('id, org_id, staff_id, created_at')
    .in('org_id', [...activeOrgs])
    .eq('is_resident_private', false)
    .neq('journal_status', 'kladde')
    .not('staff_id', 'is', null)
    .gte('created_at', since)
    .limit(5000);
  if (notesRes.error) {
    console.error('[cron assistant-suggestions] fagsystem-notater:', notesRes.error.message);
    return [];
  }
  const notes = (notesRes.data ?? []) as TransferNoteRow[];
  if (notes.length === 0) return [];

  const transferredIds = new Set<string>();
  const ids = notes.map((n) => n.id);
  for (let i = 0; i < ids.length; i += 300) {
    const { data, error } = await supabase
      .from('journal_fagsystem_transfers')
      .select('journal_entry_id')
      .in('journal_entry_id', ids.slice(i, i + 300));
    if (error) {
      console.error('[cron assistant-suggestions] fagsystem-overførsler:', error.message);
      return [];
    }
    for (const r of data ?? []) transferredIds.add(r.journal_entry_id as string);
  }
  return fagsystemReminders({ now, notes, transferredIds, activeOrgs });
}

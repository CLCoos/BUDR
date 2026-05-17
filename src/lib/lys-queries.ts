// BUDR: Lys/Recovery Supabase queries
// Bemærk: Beboer-data-mutationer går normalt gennem /api/lys/* routes med service-role.
// Disse client-side queries bruges af Care Portal-staff (autentificerede via Supabase Auth),
// hvor RLS på lys_*-tabellerne tjekker mod care_staff_can_access_resident().

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type {
  LysCheckin,
  LysCheckinInsert,
  LysReflection,
  LysReflectionInsert,
  LysRecoveryProfile,
  LysNextStep,
  LysNextStepInsert,
  LysRecoveryStory,
  LysSafetyEvent,
  ChimeDomain,
  ChimeDomainScores,
  NextStepStatus,
} from '@/types/lys';

function getSupabase(client?: SupabaseClient) {
  if (client) return client;
  const browser = createClient();
  if (!browser) throw new Error('Supabase ikke konfigureret');
  return browser;
}

// ─── Trivselspuls ──────────────────────────────────────

export async function insertCheckin(data: LysCheckinInsert): Promise<LysCheckin> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase.from('lys_checkin').insert(data).select().single();
  if (error) throw error;
  return row as LysCheckin;
}

export async function getCheckinHistory(
  residentId: string,
  days = 30,
  supabaseClient?: SupabaseClient
): Promise<LysCheckin[]> {
  const supabase = getSupabase(supabaseClient);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('lys_checkin')
    .select('*')
    .eq('resident_id', residentId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as LysCheckin[];
}

/**
 * Beregner gennemsnitlig CHIME-domæne-score over de seneste 30 dage.
 * Returnerer null for et domæne hvis der ingen scores er.
 */
export async function getChimeScoresAvg30d(residentId: string): Promise<ChimeDomainScores> {
  const checkins = await getCheckinHistory(residentId, 30);

  const avg = (
    field:
      | 'connectedness_score'
      | 'hope_score'
      | 'identity_score'
      | 'meaning_score'
      | 'empowerment_score'
  ): number | null => {
    const scores = checkins.map((c) => c[field]).filter((s): s is number => typeof s === 'number');
    if (scores.length === 0) return null;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  };

  return {
    connectedness: avg('connectedness_score'),
    hope: avg('hope_score'),
    identity: avg('identity_score'),
    meaning: avg('meaning_score'),
    empowerment: avg('empowerment_score'),
  };
}

// ─── Refleksion ────────────────────────────────────────

export async function insertReflection(data: LysReflectionInsert): Promise<LysReflection> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase.from('lys_reflection').insert(data).select().single();
  if (error) throw error;
  return row as LysReflection;
}

export async function getReflectionHistory(
  residentId: string,
  limit = 20,
  supabaseClient?: SupabaseClient
): Promise<LysReflection[]> {
  const supabase = getSupabase(supabaseClient);
  const { data, error } = await supabase
    .from('lys_reflection')
    .select('*')
    .eq('resident_id', residentId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LysReflection[];
}

// ─── Recovery-profil ───────────────────────────────────

export async function getRecoveryProfile(
  residentId: string,
  supabaseClient?: SupabaseClient
): Promise<LysRecoveryProfile | null> {
  const supabase = getSupabase(supabaseClient);
  const { data, error } = await supabase
    .from('lys_recovery_profile')
    .select('*')
    .eq('resident_id', residentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as LysRecoveryProfile) ?? null;
}

export async function upsertRecoveryProfile(
  residentId: string,
  orgId: string | null,
  fields: Partial<
    Omit<
      LysRecoveryProfile,
      'id' | 'resident_id' | 'org_id' | 'version' | 'created_at' | 'updated_at'
    >
  >
): Promise<LysRecoveryProfile> {
  const supabase = getSupabase();
  const existing = await getRecoveryProfile(residentId);

  if (existing) {
    const { data, error } = await supabase
      .from('lys_recovery_profile')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as LysRecoveryProfile;
  }

  const { data, error } = await supabase
    .from('lys_recovery_profile')
    .insert({ resident_id: residentId, org_id: orgId, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data as LysRecoveryProfile;
}

export function computeRecoveryProfileCompletion(profile: LysRecoveryProfile | null): number {
  if (!profile) return 0;
  const fields: (keyof LysRecoveryProfile)[] = [
    'connectedness_people',
    'connectedness_support',
    'connectedness_belonging',
    'hope_dreams',
    'hope_small_wishes',
    'identity_strengths',
    'identity_proud_of',
    'identity_likes',
    'identity_body',
    'meaning_values',
    'meaning_purpose',
    'empowerment_choices',
    'empowerment_capabilities',
  ];
  const filled = fields.filter((f) => {
    const v = profile[f];
    return typeof v === 'string' && v.trim().length > 0;
  }).length;
  return Math.round((filled / fields.length) * 100);
}

// ─── Næste skridt ──────────────────────────────────────

export async function insertNextStep(data: LysNextStepInsert): Promise<LysNextStep> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase.from('lys_next_steps').insert(data).select().single();
  if (error) throw error;
  return row as LysNextStep;
}

export async function getActiveNextSteps(
  residentId: string,
  supabaseClient?: SupabaseClient
): Promise<LysNextStep[]> {
  const supabase = getSupabase(supabaseClient);
  const { data, error } = await supabase
    .from('lys_next_steps')
    .select('*')
    .eq('resident_id', residentId)
    .eq('status', 'aktiv')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LysNextStep[];
}

export async function getAllNextSteps(residentId: string): Promise<LysNextStep[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('lys_next_steps')
    .select('*')
    .eq('resident_id', residentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LysNextStep[];
}

export async function updateNextStepStatus(
  stepId: string,
  status: NextStepStatus,
  completedAt: string | null = null
): Promise<LysNextStep> {
  const supabase = getSupabase();
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'fuldført' && completedAt === null) {
    update.completed_at = new Date().toISOString();
  } else if (completedAt !== null) {
    update.completed_at = completedAt;
  }
  const { data, error } = await supabase
    .from('lys_next_steps')
    .update(update)
    .eq('id', stepId)
    .select()
    .single();
  if (error) throw error;
  return data as LysNextStep;
}

export async function updateNextStepNote(
  stepId: string,
  noteType: 'resident' | 'staff',
  note: string
): Promise<LysNextStep> {
  const supabase = getSupabase();
  const update =
    noteType === 'resident'
      ? { resident_note: note, updated_at: new Date().toISOString() }
      : { staff_note: note, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('lys_next_steps')
    .update(update)
    .eq('id', stepId)
    .select()
    .single();
  if (error) throw error;
  return data as LysNextStep;
}

// ─── Recovery story ────────────────────────────────────

export async function getRecoveryStoryByJournalId(
  journalEntryId: string
): Promise<LysRecoveryStory | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('lys_recovery_stories')
    .select('*')
    .eq('related_journal_entry_id', journalEntryId)
    .maybeSingle();
  if (error) throw error;
  return (data as LysRecoveryStory) ?? null;
}

export async function getRecoveryStoriesForResident(
  residentId: string
): Promise<LysRecoveryStory[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('lys_recovery_stories')
    .select('*')
    .eq('resident_id', residentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LysRecoveryStory[];
}

export async function approveRecoveryStory(storyId: string): Promise<LysRecoveryStory> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('lys_recovery_stories')
    .update({ resident_approved: true, updated_at: new Date().toISOString() })
    .eq('id', storyId)
    .select()
    .single();
  if (error) throw error;
  return data as LysRecoveryStory;
}

// ─── Hjælpefunktioner til CHIME-domæner ────────────────

export function strongestChimeDomain30d(scores: ChimeDomainScores): ChimeDomain | null {
  const entries = (Object.entries(scores) as [ChimeDomain, number | null][]).filter(
    (entry): entry is [ChimeDomain, number] => entry[1] !== null
  );
  if (entries.length === 0) return null;
  return entries.reduce((best, current) => (current[1] > best[1] ? current : best))[0];
}

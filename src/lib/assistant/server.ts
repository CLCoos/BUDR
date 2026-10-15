/** Fælles opslag for assistentens API-ruter (kører med medarbejderens egen klient og RLS). */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AssistantAction } from './actions';
import type { AppliedResult } from './apply';
import type { SuggestionKind } from './generators';
import type { ResidentNameRow } from './names';

export type SuggestionRow = {
  id: string;
  resident_id: string | null;
  recipient_id: string | null;
  audience: 'personlig' | 'ledere' | 'alle';
  kind: SuggestionKind;
  title: string;
  body: string | null;
  actions: AssistantAction[];
  prompt: string | null;
  link: string | null;
  status: 'aaben' | 'udfoert' | 'afvist' | 'udloebet';
  applied: AppliedResult[];
  created_at: string;
};

export const SUGGESTION_COLUMNS =
  'id, resident_id, recipient_id, audience, kind, title, body, actions, prompt, link, status, applied, created_at';

export async function loadResidents(
  supabase: SupabaseClient,
  orgId: string
): Promise<ResidentNameRow[]> {
  const { data } = await supabase
    .from('care_residents')
    .select('user_id, first_name, last_name, display_name, nickname')
    .eq('org_id', orgId)
    .order('display_name');
  return (data ?? []) as ResidentNameRow[];
}

export async function loadStaffName(supabase: SupabaseClient, staffId: string): Promise<string> {
  const { data } = await supabase
    .from('care_staff')
    .select('full_name')
    .eq('id', staffId)
    .maybeSingle();
  return (data as { full_name?: string | null } | null)?.full_name?.trim() || 'Personale';
}

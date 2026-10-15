/**
 * Udfører godkendte handlinger med medarbejderens egen Supabase-klient, så RLS gælder præcis
 * som hvis de selv havde oprettet notatet, opgaven eller aftalen i portalen.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { copenhagenYmd } from '@/lib/copenhagenDay';
import { buildPlannerInsertRow } from '@/lib/plannerEntries';
import { buildStaffTaskInsertRow, initialsFromDisplayName } from '@/lib/staffTasks';
import type { AssistantAction } from './actions';

export type ApplyContext = {
  supabase: SupabaseClient;
  orgId: string;
  staffId: string;
  staffName: string;
  residentId: string;
};

export type AppliedResult = {
  action_id: string;
  type: AssistantAction['type'];
  ok: boolean;
  table?: 'journal_entries' | 'care_staff_tasks' | 'care_planner_entries';
  record_id?: string;
  error?: string;
};

const DK = 'Europe/Copenhagen';

function copenhagenOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DK,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const hour = get('hour') === 24 ? 0 : get('hour');
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Dansk vægur ("2026-10-15", "09:45") → det rigtige UTC-øjeblik, også omkring sommertid. */
export function copenhagenLocalToDate(ymd: string, hhmm: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  const [h, min] = hhmm.split(':').map(Number);
  const wall = Date.UTC(y!, m! - 1, d!, h!, min!);
  let guess = new Date(wall - copenhagenOffsetMinutes(new Date(wall)) * 60000);
  guess = new Date(wall - copenhagenOffsetMinutes(guess) * 60000);
  return guess;
}

async function insertReturningId(
  ctx: ApplyContext,
  table: 'journal_entries' | 'care_staff_tasks' | 'care_planner_entries',
  row: Record<string, unknown>
): Promise<{ id?: string; error?: string }> {
  const { data, error } = await ctx.supabase.from(table).insert(row).select('id').single();
  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}

async function applyOne(ctx: ApplyContext, a: AssistantAction): Promise<AppliedResult> {
  const base = { action_id: a.id, type: a.type };
  switch (a.type) {
    case 'journal_note': {
      const r = await insertReturningId(ctx, 'journal_entries', {
        resident_id: ctx.residentId,
        staff_id: ctx.staffId,
        staff_name: ctx.staffName,
        entry_text: a.text,
        category: a.category,
        journal_status: 'kladde',
        show_in_diary: false,
        approved_at: null,
        approved_by: null,
        org_id: ctx.orgId,
      });
      return r.id
        ? { ...base, ok: true, table: 'journal_entries', record_id: r.id }
        : { ...base, ok: false, error: r.error };
    }
    case 'task':
    case 'medication_request': {
      const isMed = a.type === 'medication_request';
      const row = buildStaffTaskInsertRow({
        orgId: ctx.orgId,
        createdBy: ctx.staffId,
        residentId: ctx.residentId,
        title: isMed ? `Medicinansvarlig: ${a.text}` : a.title,
        deadlineYmd: isMed ? copenhagenYmd() : a.deadline,
        assignedTo: initialsFromDisplayName(ctx.staffName),
        priority: isMed ? 'høj' : 'mellem',
      });
      const r = await insertReturningId(ctx, 'care_staff_tasks', row);
      return r.id
        ? { ...base, ok: true, table: 'care_staff_tasks', record_id: r.id }
        : { ...base, ok: false, error: r.error };
    }
    case 'calendar': {
      const row = buildPlannerInsertRow({
        orgId: ctx.orgId,
        title: a.title,
        type: a.category,
        scheduledAt: copenhagenLocalToDate(a.date, a.time),
        residentUserId: ctx.residentId,
        location: a.location,
        responsible: ctx.staffName,
        house: '',
      });
      if (!row) return { ...base, ok: false, error: 'Ugyldig aftale' };
      const r = await insertReturningId(ctx, 'care_planner_entries', row);
      return r.id
        ? { ...base, ok: true, table: 'care_planner_entries', record_id: r.id }
        : { ...base, ok: false, error: r.error };
    }
  }
}

/** Én ad gangen, så rækkefølgen i historikken svarer til listen medarbejderen så. */
export async function applyActions(
  ctx: ApplyContext,
  actions: AssistantAction[]
): Promise<AppliedResult[]> {
  const results: AppliedResult[] = [];
  for (const a of actions) results.push(await applyOne(ctx, a));
  return results;
}

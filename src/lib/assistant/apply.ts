/**
 * Udfører godkendte handlinger med medarbejderens egen Supabase-klient, så RLS gælder præcis
 * som hvis de selv havde oprettet notatet, opgaven eller aftalen i portalen.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { copenhagenLocalToDate, copenhagenYmd } from '@/lib/copenhagenDay';
import { appendHandoverLine, handoverRecordDate, handoverShiftNow } from '@/lib/handoverNotes';
import { buildPlannerInsertRow } from '@/lib/plannerEntries';
import { buildStaffTaskInsertRow, initialsFromDisplayName } from '@/lib/staffTasks';
import type { AssistantAction } from './actions';

export { copenhagenLocalToDate };

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
  table?: 'journal_entries' | 'care_staff_tasks' | 'care_planner_entries' | 'care_handover_notes';
  record_id?: string;
  error?: string;
};

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
    case 'handover': {
      // Én række pr. borger, dag og vagt: linjen lægges under det, kollegerne allerede har skrevet.
      const shiftLabel = handoverShiftNow();
      const shiftDate = handoverRecordDate(shiftLabel);
      const { data: existing, error: readError } = await ctx.supabase
        .from('care_handover_notes')
        .select('body')
        .eq('resident_id', ctx.residentId)
        .eq('shift_date', shiftDate)
        .eq('shift_label', shiftLabel)
        .maybeSingle();
      if (readError) return { ...base, ok: false, error: readError.message };
      const { data, error } = await ctx.supabase
        .from('care_handover_notes')
        .upsert(
          {
            resident_id: ctx.residentId,
            org_id: ctx.orgId,
            staff_id: ctx.staffId,
            shift_label: shiftLabel,
            shift_date: shiftDate,
            body: appendHandoverLine((existing as { body?: string } | null)?.body, a.text),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'resident_id,shift_date,shift_label' }
        )
        .select('id')
        .single();
      if (error) return { ...base, ok: false, error: error.message };
      return {
        ...base,
        ok: true,
        table: 'care_handover_notes',
        record_id: (data as { id: string }).id,
      };
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

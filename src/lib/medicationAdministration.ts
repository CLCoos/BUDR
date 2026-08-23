import type { SupabaseClient } from '@supabase/supabase-js';
import { copenhagenYmd } from '@/lib/copenhagenDay';

export type MedicationAdministrationRow = {
  medication_id: string;
  given_at: string;
};

export type PersistResult = { ok: true } | { ok: false; message: string };

const LIVE_TASK_ID_RE =
  /^live-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\d{4}-\d{2}-\d{2})$/i;

export function liveMedicationTaskId(medicationId: string, ymd: string): string {
  return `live-${medicationId}-${ymd}`;
}

export function parseLiveMedicationTaskId(
  taskId: string
): { medicationId: string; ymd: string } | null {
  const m = LIVE_TASK_ID_RE.exec(taskId.trim());
  if (!m) return null;
  return { medicationId: m[1]!, ymd: m[2]! };
}

export function isMissingMedicationAdministrationsRelation(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('medication_administrations') &&
    (m.includes('does not exist') || m.includes('schema cache'))
  );
}

export function givenAtByMedicationId(rows: MedicationAdministrationRow[]): Map<string, Date> {
  const map = new Map<string, Date>();
  for (const row of rows) {
    const t = Date.parse(row.given_at);
    if (Number.isNaN(t)) continue;
    map.set(row.medication_id, new Date(t));
  }
  return map;
}

export async function fetchMedicationAdministrationsForDate(
  supabase: SupabaseClient,
  medicationIds: string[],
  scheduledDate: string = copenhagenYmd()
): Promise<{ rows: MedicationAdministrationRow[]; error: string | null }> {
  if (medicationIds.length === 0) return { rows: [], error: null };

  const { data, error } = await supabase
    .from('medication_administrations')
    .select('medication_id, given_at')
    .in('medication_id', medicationIds)
    .eq('scheduled_date', scheduledDate);

  if (error) {
    if (isMissingMedicationAdministrationsRelation(error.message)) {
      return { rows: [], error: error.message };
    }
    return { rows: [], error: error.message };
  }

  return { rows: (data ?? []) as MedicationAdministrationRow[], error: null };
}

export async function markMedicationGiven(args: {
  supabase: SupabaseClient;
  residentId: string;
  medicationId: string;
  scheduledDate?: string;
}): Promise<PersistResult> {
  const scheduledDate = args.scheduledDate ?? copenhagenYmd();
  const {
    data: { user },
  } = await args.supabase.auth.getUser();

  const { data: medRow, error: medErr } = await args.supabase
    .from('resident_medications')
    .select('id, resident_id, org_id')
    .eq('id', args.medicationId)
    .maybeSingle();

  if (medErr) {
    return { ok: false, message: medErr.message };
  }
  if (!medRow || (medRow as { resident_id: string }).resident_id !== args.residentId) {
    return { ok: false, message: 'Medicin ikke fundet' };
  }

  const orgId = (medRow as { org_id?: string | null }).org_id ?? null;
  const { error } = await args.supabase.from('medication_administrations').insert({
    resident_id: args.residentId,
    medication_id: args.medicationId,
    org_id: orgId,
    scheduled_date: scheduledDate,
    given_at: new Date().toISOString(),
    given_by: user?.id ?? null,
  });

  if (error) {
    if (error.code === '23505') return { ok: true };
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function unmarkMedicationGiven(args: {
  supabase: SupabaseClient;
  medicationId: string;
  scheduledDate?: string;
}): Promise<PersistResult> {
  const scheduledDate = args.scheduledDate ?? copenhagenYmd();
  const { error } = await args.supabase
    .from('medication_administrations')
    .delete()
    .eq('medication_id', args.medicationId)
    .eq('scheduled_date', scheduledDate);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

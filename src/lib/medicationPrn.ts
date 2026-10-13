import type { SupabaseClient } from '@supabase/supabase-js';
import { copenhagenStartOfDateUtcIso, copenhagenYmd } from '@/lib/copenhagenDay';

/** Behovsmedicin (PN): flere doser pr. dag, hver med begrundelse og evt. noteret effekt. */

export const PRN_TIME_GROUP = 'behoev';
export const PRN_TEXT_MAX = 1000;

export type PrnAdministration = {
  id: string;
  medicationId: string;
  givenAt: Date;
  reason: string;
  effect: string | null;
};

export type PrnResult = { ok: true } | { ok: false; message: string };

export function isPrnMedication(med: { time_group: string }): boolean {
  return med.time_group === PRN_TIME_GROUP;
}

export function normalizePrnText(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, PRN_TEXT_MAX);
}

export function parsePrnRow(row: Record<string, unknown>): PrnAdministration | null {
  const id = typeof row.id === 'string' ? row.id : null;
  const medicationId = typeof row.medication_id === 'string' ? row.medication_id : null;
  const givenAtMs = typeof row.given_at === 'string' ? Date.parse(row.given_at) : NaN;
  const reason = typeof row.reason === 'string' ? row.reason : null;
  if (!id || !medicationId || Number.isNaN(givenAtMs) || !reason) return null;
  return {
    id,
    medicationId,
    givenAt: new Date(givenAtMs),
    reason,
    effect: typeof row.effect === 'string' && row.effect ? row.effect : null,
  };
}

/** PN-doser for borgeren på en dansk kalenderdag, nyeste først. Annullerede udelades. */
export async function fetchPrnForDay(
  supabase: SupabaseClient,
  residentId: string,
  ymd: string = copenhagenYmd()
): Promise<{ rows: PrnAdministration[]; error: string | null }> {
  const start = copenhagenStartOfDateUtcIso(ymd);
  const next = new Date(Date.parse(`${ymd}T12:00:00Z`) + 24 * 3600 * 1000);
  const end = copenhagenStartOfDateUtcIso(copenhagenYmd(next));
  const { data, error } = await supabase
    .from('medication_prn_administrations')
    .select('id, medication_id, given_at, reason, effect')
    .eq('resident_id', residentId)
    .is('cancelled_at', null)
    .gte('given_at', start)
    .lt('given_at', end)
    .order('given_at', { ascending: false });
  if (error) return { rows: [], error: error.message };
  return {
    rows: (data ?? [])
      .map((r) => parsePrnRow(r as Record<string, unknown>))
      .filter((r): r is PrnAdministration => r !== null),
    error: null,
  };
}

export async function givePrn(args: {
  supabase: SupabaseClient;
  residentId: string;
  medicationId: string;
  reason: string;
}): Promise<PrnResult> {
  const reason = normalizePrnText(args.reason);
  if (!reason) return { ok: false, message: 'Skriv hvorfor der gives PN' };
  const {
    data: { user },
  } = await args.supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Ikke logget ind' };

  const { data: resident } = await args.supabase
    .from('care_residents')
    .select('org_id')
    .eq('user_id', args.residentId)
    .maybeSingle();
  const orgId = (resident as { org_id?: string | null } | null)?.org_id ?? null;
  if (!orgId) return { ok: false, message: 'Borger ikke fundet' };

  const { error } = await args.supabase.from('medication_prn_administrations').insert({
    resident_id: args.residentId,
    medication_id: args.medicationId,
    org_id: orgId,
    given_by: user.id,
    reason,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function notePrnEffect(args: {
  supabase: SupabaseClient;
  id: string;
  effect: string;
}): Promise<PrnResult> {
  const effect = normalizePrnText(args.effect);
  if (!effect) return { ok: false, message: 'Skriv effekten' };
  const { error } = await args.supabase
    .from('medication_prn_administrations')
    .update({ effect })
    .eq('id', args.id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Fejlregistrering: annulleres (bevares i revisionssporet), slettes ikke. */
export async function cancelPrn(args: {
  supabase: SupabaseClient;
  id: string;
}): Promise<PrnResult> {
  const {
    data: { user },
  } = await args.supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Ikke logget ind' };
  const { error } = await args.supabase
    .from('medication_prn_administrations')
    .update({ cancelled_at: new Date().toISOString(), cancelled_by: user.id })
    .eq('id', args.id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

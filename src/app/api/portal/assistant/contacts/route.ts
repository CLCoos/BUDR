import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { UUID_RE, readJson, requireStaff } from '@/app/api/portal/documents/_auth';
import { PERMISSIONS } from '@/lib/permissions';

const MAX_CONTACTS = 3;

type ContactOut = { staff_id: string; full_name: string; role: 'primaer' | 'sekundaer' };

async function listContacts(supabase: SupabaseClient, orgId: string, residentId: string) {
  const [contactsRes, staffRes] = await Promise.all([
    supabase
      .from('resident_contacts')
      .select('staff_id, role')
      .eq('resident_id', residentId)
      .order('role'),
    supabase.from('care_staff').select('id, full_name').eq('org_id', orgId).order('full_name'),
  ]);
  const staff = (staffRes.data ?? []) as { id: string; full_name: string | null }[];
  const nameOf = new Map(staff.map((s) => [s.id, s.full_name?.trim() || 'Medarbejder']));
  const contacts: ContactOut[] = ((contactsRes.data ?? []) as { staff_id: string; role: string }[])
    .filter((c) => nameOf.has(c.staff_id))
    .map((c) => ({
      staff_id: c.staff_id,
      full_name: nameOf.get(c.staff_id)!,
      role: c.role === 'sekundaer' ? 'sekundaer' : 'primaer',
    }));
  return {
    contacts,
    staff: staff.map((s) => ({ id: s.id, full_name: nameOf.get(s.id)! })),
    missingTable: ['42P01', 'PGRST205'].includes(contactsRes.error?.code ?? ''),
  };
}

/** GET /api/portal/assistant/contacts?resident_id= — borgerens kontaktpersoner. */
export async function GET(req: Request) {
  const ctx = await requireStaff(PERMISSIONS.VIEW_RESIDENTS);
  if ('error' in ctx) return ctx.error;
  const residentId = new URL(req.url).searchParams.get('resident_id') ?? '';
  if (!UUID_RE.test(residentId)) {
    return NextResponse.json({ error: 'Ukendt borger' }, { status: 400 });
  }
  const result = await listContacts(ctx.supabase, ctx.orgId, residentId);
  return NextResponse.json({
    ...result,
    canEdit: ctx.permissions.includes(PERMISSIONS.MANAGE_RESIDENTS),
  });
}

/**
 * PUT /api/portal/assistant/contacts — { resident_id, staff_ids } (første = primær).
 * Kun ledere (manage_residents). Erstatter hele listen.
 */
export async function PUT(req: Request) {
  const ctx = await requireStaff(PERMISSIONS.MANAGE_RESIDENTS);
  if ('error' in ctx) return ctx.error;
  const body = await readJson(req);
  const residentId = typeof body?.resident_id === 'string' ? body.resident_id : '';
  if (!UUID_RE.test(residentId)) {
    return NextResponse.json({ error: 'Ukendt borger' }, { status: 400 });
  }
  const raw = Array.isArray(body?.staff_ids) ? body.staff_ids : [];
  const staffIds = [
    ...new Set(raw.filter((v): v is string => typeof v === 'string' && UUID_RE.test(v))),
  ].slice(0, MAX_CONTACTS);

  const { data: resident } = await ctx.supabase
    .from('care_residents')
    .select('user_id')
    .eq('user_id', residentId)
    .eq('org_id', ctx.orgId)
    .maybeSingle();
  if (!resident) return NextResponse.json({ error: 'Ukendt borger' }, { status: 404 });

  if (staffIds.length > 0) {
    const { data: staff } = await ctx.supabase
      .from('care_staff')
      .select('id')
      .eq('org_id', ctx.orgId)
      .in('id', staffIds);
    if ((staff ?? []).length !== staffIds.length) {
      return NextResponse.json({ error: 'Ukendt medarbejder' }, { status: 400 });
    }
  }

  // Først de nye (så en fejl ikke efterlader borgeren uden kontaktperson), derefter de gamle væk.
  if (staffIds.length > 0) {
    const up = await ctx.supabase.from('resident_contacts').upsert(
      staffIds.map((id, i) => ({
        resident_id: residentId,
        staff_id: id,
        org_id: ctx.orgId,
        role: i === 0 ? 'primaer' : 'sekundaer',
      })),
      { onConflict: 'resident_id,staff_id' }
    );
    if (up.error) {
      console.error('[assistant contacts] upsert:', up.error.message);
      return NextResponse.json({ error: 'Kunne ikke gemme kontaktpersoner' }, { status: 500 });
    }
  }
  let del = ctx.supabase.from('resident_contacts').delete().eq('resident_id', residentId);
  if (staffIds.length > 0) del = del.not('staff_id', 'in', `(${staffIds.join(',')})`);
  const delRes = await del;
  if (delRes.error) {
    console.error('[assistant contacts] delete:', delRes.error.message);
    return NextResponse.json({ error: 'Kunne ikke gemme kontaktpersoner' }, { status: 500 });
  }
  const result = await listContacts(ctx.supabase, ctx.orgId, residentId);
  return NextResponse.json({ ...result, canEdit: true });
}

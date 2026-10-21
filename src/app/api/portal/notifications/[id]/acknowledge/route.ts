import { NextResponse } from 'next/server';
import { requireStaff, UUID_RE } from '@/app/api/portal/documents/_auth';
import { PERMISSIONS } from '@/lib/permissions';

/**
 * POST /api/portal/notifications/[id]/acknowledge — personalet markerer en alarm eller en
 * besked fra en borger som set. Borgeren ser kvitteringen i Lys («Mette har set din besked»).
 * Opdateres med medarbejderens egen klient, så RLS (adgang til borgeren) gælder.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Ugyldigt id' }, { status: 400 });
  }
  const ctx = await requireStaff(PERMISSIONS.VIEW_DASHBOARD);
  if ('error' in ctx) return ctx.error;
  const { supabase, user } = ctx;

  const { data, error } = await supabase
    .from('care_portal_notifications')
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user.id })
    .eq('id', id)
    .is('acknowledged_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[notifications/acknowledge]', error.message);
    return NextResponse.json({ error: 'Kunne ikke markere som set' }, { status: 500 });
  }
  // Ingen række: allerede set af en kollega, eller ingen adgang. Begge dele er fine for UI'et.
  return NextResponse.json({ ok: true, updated: Boolean(data) });
}

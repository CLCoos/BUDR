import { NextResponse } from 'next/server';
import { UUID_RE, requireStaff } from '@/app/api/portal/documents/_auth';
import { PERMISSIONS } from '@/lib/permissions';

/** POST /api/portal/assistant/[id]/dismiss — "Nej tak" til et forslag. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Ukendt forslag' }, { status: 400 });
  const ctx = await requireStaff(PERMISSIONS.VIEW_DASHBOARD);
  if ('error' in ctx) return ctx.error;

  const { data, error } = await ctx.supabase
    .from('assistant_suggestions')
    .update({ status: 'afvist' })
    .eq('id', id)
    .eq('status', 'aaben')
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('[assistant dismiss]', error.message);
    return NextResponse.json({ error: 'Kunne ikke afvise forslaget' }, { status: 500 });
  }
  if (!data)
    return NextResponse.json({ error: 'Forslaget er allerede håndteret' }, { status: 409 });
  return NextResponse.json({ ok: true });
}

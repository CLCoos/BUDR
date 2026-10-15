import { NextResponse } from 'next/server';
import { requireStaff } from '@/app/api/portal/documents/_auth';
import { residentLabel } from '@/lib/assistant/names';
import { SUGGESTION_COLUMNS, loadResidents, type SuggestionRow } from '@/lib/assistant/server';
import { PERMISSIONS } from '@/lib/permissions';

/** GET /api/portal/assistant — åbne forslag til mig + borgerliste til "Fortæl assistenten". */
export async function GET() {
  const ctx = await requireStaff(PERMISSIONS.VIEW_DASHBOARD);
  if ('error' in ctx) return ctx.error;

  const [suggestionsRes, residents] = await Promise.all([
    ctx.supabase
      .from('assistant_suggestions')
      .select(SUGGESTION_COLUMNS)
      .eq('org_id', ctx.orgId)
      .eq('status', 'aaben')
      .order('created_at', { ascending: false })
      .limit(30),
    loadResidents(ctx.supabase, ctx.orgId),
  ]);

  // Tabellen findes ikke endnu (migration ikke kørt): vis tom liste frem for en fejl.
  const missingTable = ['42P01', 'PGRST205'].includes(suggestionsRes.error?.code ?? '');
  if (suggestionsRes.error && !missingTable) {
    console.error('[assistant] list:', suggestionsRes.error.message);
    return NextResponse.json({ error: 'Kunne ikke hente forslag' }, { status: 500 });
  }

  return NextResponse.json({
    me: ctx.user.id,
    canWrite: ctx.permissions.includes(PERMISSIONS.WRITE_JOURNAL),
    suggestions: (suggestionsRes.data ?? []) as SuggestionRow[],
    residents: residents.map((r) => ({
      id: r.user_id,
      name: residentLabel(r),
    })),
  });
}

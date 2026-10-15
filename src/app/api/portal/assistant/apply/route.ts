import { NextResponse } from 'next/server';
import { UUID_RE, readJson, requireStaff } from '@/app/api/portal/documents/_auth';
import { sanitizeActions } from '@/lib/assistant/actions';
import { applyActions } from '@/lib/assistant/apply';
import { SUGGESTION_COLUMNS, loadStaffName, type SuggestionRow } from '@/lib/assistant/server';
import { copenhagenYmd } from '@/lib/copenhagenDay';
import { PERMISSIONS } from '@/lib/permissions';

/**
 * POST /api/portal/assistant/apply — { resident_id, actions, suggestion_id?, text?, summary? }
 * Udfører de handlinger, medarbejderen har godkendt (evt. rettet), med deres egne rettigheder.
 * Et forslag markeres som udført; et frit svar gemmes som historik.
 */
export async function POST(req: Request) {
  const ctx = await requireStaff(PERMISSIONS.WRITE_JOURNAL);
  if ('error' in ctx) return ctx.error;

  const body = await readJson(req);
  const residentId = typeof body?.resident_id === 'string' ? body.resident_id : '';
  if (!UUID_RE.test(residentId)) {
    return NextResponse.json({ error: 'Vælg en borger' }, { status: 400 });
  }
  const actions = sanitizeActions(body?.actions, copenhagenYmd());
  if (actions.length === 0) {
    return NextResponse.json({ error: 'Der er ikke valgt noget at gemme' }, { status: 400 });
  }

  const { data: resident } = await ctx.supabase
    .from('care_residents')
    .select('user_id')
    .eq('user_id', residentId)
    .eq('org_id', ctx.orgId)
    .maybeSingle();
  if (!resident) return NextResponse.json({ error: 'Ukendt borger' }, { status: 404 });

  let suggestion: SuggestionRow | null = null;
  const suggestionId = typeof body?.suggestion_id === 'string' ? body.suggestion_id : null;
  if (suggestionId) {
    if (!UUID_RE.test(suggestionId)) {
      return NextResponse.json({ error: 'Ukendt forslag' }, { status: 400 });
    }
    const { data } = await ctx.supabase
      .from('assistant_suggestions')
      .select(SUGGESTION_COLUMNS)
      .eq('id', suggestionId)
      .maybeSingle();
    suggestion = (data as SuggestionRow | null) ?? null;
    if (!suggestion) return NextResponse.json({ error: 'Ukendt forslag' }, { status: 404 });
    if (suggestion.status !== 'aaben') {
      return NextResponse.json({ error: 'Forslaget er allerede håndteret' }, { status: 409 });
    }
    if (suggestion.resident_id && suggestion.resident_id !== residentId) {
      return NextResponse.json({ error: 'Forslaget gælder en anden borger' }, { status: 400 });
    }
  }

  const staffName = await loadStaffName(ctx.supabase, ctx.user.id);
  const results = await applyActions(
    { supabase: ctx.supabase, orgId: ctx.orgId, staffId: ctx.user.id, staffName, residentId },
    actions
  );
  const okCount = results.filter((r) => r.ok).length;
  if (okCount === 0) {
    console.error('[assistant apply] alle fejlede:', results.map((r) => r.error).join(' | '));
    return NextResponse.json(
      { error: 'Kunne ikke gemme. Prøv igen, eller opret det manuelt.', results },
      { status: 502 }
    );
  }

  // Historik: hvad blev godkendt og oprettet. En fejl her må ikke skjule, at data er gemt.
  if (suggestion) {
    const { error } = await ctx.supabase
      .from('assistant_suggestions')
      .update({ status: 'udfoert', applied: results })
      .eq('id', suggestion.id);
    if (error) console.error('[assistant apply] markér udført:', error.message);
  } else {
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const summary = typeof body?.summary === 'string' ? body.summary.trim() : '';
    const { error } = await ctx.supabase.from('assistant_suggestions').insert({
      org_id: ctx.orgId,
      resident_id: residentId,
      recipient_id: ctx.user.id,
      audience: 'personlig',
      kind: 'svar',
      title: (summary || text || 'Svar til assistenten').slice(0, 300),
      body: text ? text.slice(0, 2000) : null,
      actions,
      status: 'udfoert',
      applied: results,
      created_by: ctx.user.id,
    });
    if (error) console.error('[assistant apply] gem svar:', error.message);
  }

  return NextResponse.json({ results });
}

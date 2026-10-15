import { NextRequest, NextResponse } from 'next/server';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getDocumentType,
  sanitizeMeta,
  sanitizeSections,
  validatePeriod,
} from '@/lib/documents/registry';
import { UUID_RE, readJson, requireStaff } from './_auth';

const LIST_COLUMNS =
  'id, resident_id, doc_type, status, version, previous_id, title, meta, due_date, responsible_id, created_by, submitted_by, submitted_at, approved_by, approved_at, review_note, created_at, updated_at';

/**
 * GET /api/portal/documents?resident_id=…  — borgerens dokumenter, nyeste først.
 * GET /api/portal/documents?scope=inbox     — det, der venter på den indloggede:
 *   egne dokumenter der ikke er godkendt, og (for godkendere) alt der venter på godkendelse.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireStaff(PERMISSIONS.VIEW_360);
  if ('error' in ctx) return ctx.error;

  if (req.nextUrl.searchParams.get('scope') === 'inbox') {
    const canApprove = ctx.permissions.includes(PERMISSIONS.APPROVE_JOURNAL);
    const me = ctx.user.id;
    const filter = canApprove
      ? `status.eq.til_godkendelse,and(status.eq.kladde,or(responsible_id.eq.${me},and(responsible_id.is.null,created_by.eq.${me})))`
      : `and(status.in.(kladde,til_godkendelse),or(responsible_id.eq.${me},and(responsible_id.is.null,created_by.eq.${me})))`;
    const { data, error } = await ctx.supabase
      .from('resident_documents')
      .select(LIST_COLUMNS)
      .eq('org_id', ctx.orgId)
      .or(filter)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const residentIds = [...new Set((data ?? []).map((d) => d.resident_id as string))];
    const { data: residents } = residentIds.length
      ? await ctx.supabase
          .from('care_residents')
          .select('user_id, display_name, first_name, last_name')
          .in('user_id', residentIds)
      : { data: [] };
    const names: Record<string, string> = {};
    for (const r of residents ?? []) {
      names[r.user_id as string] =
        (r.display_name as string | null)?.trim() ||
        [r.first_name, r.last_name].filter(Boolean).join(' ') ||
        'Borger';
    }
    return NextResponse.json({ documents: data ?? [], residentNames: names, canApprove, me });
  }

  const residentId = req.nextUrl.searchParams.get('resident_id')?.trim() ?? '';
  if (!UUID_RE.test(residentId)) {
    return NextResponse.json({ error: 'invalid_resident_id' }, { status: 400 });
  }
  const { data, error } = await ctx.supabase
    .from('resident_documents')
    .select(LIST_COLUMNS)
    .eq('resident_id', residentId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}

/**
 * POST /api/portal/documents
 * Body: { resident_id, doc_type, meta, due_date? }
 * Opretter en kladde med den indloggede som ansvarlig. Afsnit, der kan udfyldes direkte fra
 * eksisterende data (fx indsatsformål fra VUM), forudfyldes.
 */
export async function POST(req: NextRequest) {
  const ctx = await requireStaff(PERMISSIONS.WRITE_JOURNAL);
  if ('error' in ctx) return ctx.error;

  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });

  const type = typeof body.doc_type === 'string' ? getDocumentType(body.doc_type) : undefined;
  if (!type || !type.available) {
    return NextResponse.json({ error: 'Ukendt dokumenttype' }, { status: 400 });
  }
  const residentId = typeof body.resident_id === 'string' ? body.resident_id.trim() : '';
  if (!UUID_RE.test(residentId)) {
    return NextResponse.json({ error: 'invalid_resident_id' }, { status: 400 });
  }
  const metaRes = sanitizeMeta(type, body.meta);
  if (!metaRes.ok) return NextResponse.json({ error: metaRes.error }, { status: 400 });
  const periodErr = validatePeriod(type, metaRes.meta);
  if (periodErr) return NextResponse.json({ error: periodErr }, { status: 400 });

  const { data: resident } = await ctx.supabase
    .from('care_residents')
    .select('user_id, org_id')
    .eq('user_id', residentId)
    .maybeSingle();
  if (!resident || resident.org_id !== ctx.orgId) {
    return NextResponse.json({ error: 'Beboer ikke fundet' }, { status: 404 });
  }

  let sections = {};
  if (type.key === 'statusrapport') {
    const { data: vum } = await ctx.supabase
      .from('vum_assessments')
      .select('case_purpose')
      .eq('resident_id', residentId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    sections = sanitizeSections(type, {
      indsatsformaal: typeof vum?.case_purpose === 'string' ? vum.case_purpose : '',
    });
  }

  const dueDate =
    typeof body.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date)
      ? body.due_date
      : (type.defaultDueDate?.(metaRes.meta) ?? null);

  const { data, error } = await ctx.supabase
    .from('resident_documents')
    .insert({
      org_id: ctx.orgId,
      resident_id: residentId,
      doc_type: type.key,
      meta: metaRes.meta,
      sections,
      due_date: dueDate,
      responsible_id: ctx.user.id,
      created_by: ctx.user.id,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data }, { status: 201 });
}

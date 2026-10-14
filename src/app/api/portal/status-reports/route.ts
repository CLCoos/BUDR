import { NextRequest, NextResponse } from 'next/server';
import { PERMISSIONS } from '@/lib/permissions';
import { sanitizeSections } from '@/lib/statusReport/sections';
import { UUID_RE, isValidDate, optionalText, requireStaff } from './_auth';

/** GET /api/portal/status-reports?resident_id=… — udtalelser for én borger, nyeste først. */
export async function GET(req: NextRequest) {
  const ctx = await requireStaff(PERMISSIONS.VIEW_360);
  if ('error' in ctx) return ctx.error;

  const residentId = req.nextUrl.searchParams.get('resident_id')?.trim() ?? '';
  if (!UUID_RE.test(residentId)) {
    return NextResponse.json({ error: 'invalid_resident_id' }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from('resident_status_reports')
    .select('*')
    .eq('resident_id', residentId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

/**
 * POST /api/portal/status-reports
 * Body: { resident_id, period_start, period_end, meeting_date?, paragraph?, contact_person? }
 * Opretter en kladde. Indsatsformålet udfyldes fra borgerens VUM-vurdering, hvis den findes.
 */
export async function POST(req: NextRequest) {
  const ctx = await requireStaff(PERMISSIONS.WRITE_JOURNAL);
  if ('error' in ctx) return ctx.error;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const residentId = typeof body.resident_id === 'string' ? body.resident_id.trim() : '';
  if (!UUID_RE.test(residentId)) {
    return NextResponse.json({ error: 'invalid_resident_id' }, { status: 400 });
  }
  if (!isValidDate(body.period_start) || !isValidDate(body.period_end)) {
    return NextResponse.json({ error: 'Ugyldig periode' }, { status: 400 });
  }
  if (body.period_end < body.period_start) {
    return NextResponse.json({ error: 'Perioden slutter før den starter' }, { status: 400 });
  }
  const meetingDate =
    body.meeting_date == null || body.meeting_date === '' ? null : body.meeting_date;
  if (meetingDate !== null && !isValidDate(meetingDate)) {
    return NextResponse.json({ error: 'Ugyldig mødedato' }, { status: 400 });
  }

  const { data: resident } = await ctx.supabase
    .from('care_residents')
    .select('user_id, org_id')
    .eq('user_id', residentId)
    .maybeSingle();
  if (!resident || resident.org_id !== ctx.orgId) {
    return NextResponse.json({ error: 'Beboer ikke fundet' }, { status: 404 });
  }

  const { data: vum } = await ctx.supabase
    .from('vum_assessments')
    .select('case_purpose')
    .eq('resident_id', residentId)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sections = sanitizeSections({
    indsatsformaal: typeof vum?.case_purpose === 'string' ? vum.case_purpose : '',
  });

  const { data, error } = await ctx.supabase
    .from('resident_status_reports')
    .insert({
      org_id: ctx.orgId,
      resident_id: residentId,
      period_start: body.period_start,
      period_end: body.period_end,
      meeting_date: meetingDate,
      paragraph: optionalText(body.paragraph, 40) ?? null,
      contact_person: optionalText(body.contact_person, 200) ?? null,
      sections,
      created_by: ctx.user.id,
      updated_by: ctx.user.id,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data }, { status: 201 });
}

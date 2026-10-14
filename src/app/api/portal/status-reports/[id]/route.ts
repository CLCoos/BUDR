import { NextRequest, NextResponse } from 'next/server';
import { PERMISSIONS } from '@/lib/permissions';
import { sanitizeSections } from '@/lib/statusReport/sections';
import { UUID_RE, isValidDate, optionalText, requireStaff } from '../_auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await requireStaff(PERMISSIONS.VIEW_360);
  if ('error' in ctx) return ctx.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from('resident_status_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ report: data });
}

/**
 * PATCH /api/portal/status-reports/[id]
 * Body (alle valgfri): { sections, status: 'faerdig', period_start, period_end, meeting_date, paragraph, contact_person }
 * `sections` flettes ind i de eksisterende afsnit. En færdig udtalelse kan ikke ændres (RLS).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await requireStaff(PERMISSIONS.WRITE_JOURNAL);
  if ('error' in ctx) return ctx.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { data: current, error: readErr } = await ctx.supabase
    .from('resident_status_reports')
    .select('status, sections, period_start, period_end')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (current.status === 'faerdig') {
    return NextResponse.json({ error: 'Udtalelsen er markeret som færdig' }, { status: 409 });
  }

  const update: Record<string, unknown> = {};
  if (body.sections !== undefined) {
    update.sections = { ...sanitizeSections(current.sections), ...sanitizeSections(body.sections) };
  }
  if (body.status === 'faerdig') update.status = 'faerdig';
  for (const key of ['period_start', 'period_end'] as const) {
    if (body[key] !== undefined) {
      if (!isValidDate(body[key])) {
        return NextResponse.json({ error: 'Ugyldig periode' }, { status: 400 });
      }
      update[key] = body[key];
    }
  }
  const start = (update.period_start ?? current.period_start) as string;
  const end = (update.period_end ?? current.period_end) as string;
  if (end < start) {
    return NextResponse.json({ error: 'Perioden slutter før den starter' }, { status: 400 });
  }
  if (body.meeting_date !== undefined) {
    if (body.meeting_date === null || body.meeting_date === '') update.meeting_date = null;
    else if (isValidDate(body.meeting_date)) update.meeting_date = body.meeting_date;
    else return NextResponse.json({ error: 'Ugyldig mødedato' }, { status: 400 });
  }
  const paragraph = optionalText(body.paragraph, 40);
  if (paragraph !== undefined) update.paragraph = paragraph;
  const contact = optionalText(body.contact_person, 200);
  if (contact !== undefined) update.contact_person = contact;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Intet at opdatere' }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from('resident_status_reports')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Ingen adgang' }, { status: 403 });
  return NextResponse.json({ report: data });
}

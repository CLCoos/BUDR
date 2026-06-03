import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { generateBriefForResident } from '@/lib/ai/generateBrief';

export const maxDuration = 60;

type ResidentRow = {
  user_id: string;
  org_id: string;
  display_name: string | null;
  first_name: string | null;
};

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET mangler' }, { status: 503 });
  if (req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const briefType: 'daily' | 'weekly' =
    url.searchParams.get('type') === 'weekly' ? 'weekly' : 'daily';
  const onlyResidentId = url.searchParams.get('resident_id')?.trim() || null;

  const supabase = createAdminSupabaseClient();

  let query = supabase.from('care_residents').select('user_id, org_id, display_name, first_name');
  if (onlyResidentId) query = query.eq('user_id', onlyResidentId);

  const { data: residents, error: resErr } = await query;
  if (resErr) {
    console.error('[cron generate-briefs] care_residents:', resErr.message);
    return NextResponse.json({ error: 'Kunne ikke hente borgere' }, { status: 500 });
  }

  const list = (residents ?? []) as ResidentRow[];

  if (url.searchParams.get('mode') === 'list') {
    return NextResponse.json({ residents: list.map((r) => r.user_id) }, { status: 200 });
  }

  const summary = { brief_type: briefType, total: list.length, ok: 0, no_data: 0, errors: 0 };

  for (const r of list) {
    const residentLabel = r.display_name?.trim() || r.first_name?.trim() || 'Beboer';
    const result = await generateBriefForResident({
      supabase,
      residentId: r.user_id,
      orgId: r.org_id,
      residentLabel,
      briefType,
    });
    if (result.status === 'ok') summary.ok += 1;
    else if (result.status === 'no_data') summary.no_data += 1;
    else {
      summary.errors += 1;
      console.error('[cron generate-briefs]', r.user_id, result.status);
    }
  }

  return NextResponse.json(summary, { status: 200 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getStaffPermissions } from '@/lib/auth/getStaffPermissions';
import { hasPermission } from '@/lib/auth/hasPermission';
import { generateBriefForResident } from '@/lib/ai/generateBrief';
import { PERMISSIONS } from '@/lib/permissions';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseStaffOrgId } from '@/lib/staffOrgScope';

export const maxDuration = 60;

/**
 * POST /api/portal/generate-brief
 * Body: { resident_id: string, brief_type?: 'daily' | 'weekly' }
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const permissions = await getStaffPermissions(supabase);
  if (!hasPermission(permissions, PERMISSIONS.VIEW_360)) {
    return NextResponse.json({ error: 'Ingen adgang' }, { status: 403 });
  }

  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!orgId) {
    return NextResponse.json({ error: 'Organisation mangler' }, { status: 403 });
  }

  let body: { resident_id?: string; brief_type?: string };
  try {
    body = (await req.json()) as { resident_id?: string; brief_type?: string };
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const residentId = typeof body.resident_id === 'string' ? body.resident_id.trim() : '';
  if (!residentId) {
    return NextResponse.json({ error: 'Manglende resident_id' }, { status: 400 });
  }

  const briefType: 'daily' | 'weekly' = body.brief_type === 'weekly' ? 'weekly' : 'daily';

  const { data: cr, error: crErr } = await supabase
    .from('care_residents')
    .select('user_id, org_id, first_name, display_name')
    .eq('user_id', residentId)
    .maybeSingle();

  if (crErr) {
    console.error('[generate-brief] care_residents:', crErr.message);
    return NextResponse.json({ error: 'Kunne ikke hente beboer' }, { status: 500 });
  }
  if (!cr) {
    return NextResponse.json({ error: 'Beboer ikke fundet' }, { status: 404 });
  }
  if (cr.org_id !== orgId) {
    return NextResponse.json({ error: 'Ingen adgang til beboer' }, { status: 403 });
  }

  const residentLabel =
    (typeof cr.display_name === 'string' && cr.display_name.trim()) ||
    (typeof cr.first_name === 'string' && cr.first_name.trim()) ||
    'Beboer';

  const result = await generateBriefForResident({
    supabase,
    residentId,
    orgId,
    residentLabel,
    briefType,
  });

  switch (result.status) {
    case 'no_data':
      return NextResponse.json({ error: 'ikke_nok_data' }, { status: 200 });
    case 'not_configured':
      return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });
    case 'ai_error':
      return NextResponse.json({ error: 'ai_fejl' }, { status: 502 });
    case 'parse_error':
      return NextResponse.json({ error: 'parse_fejl' }, { status: 502 });
    case 'db_error':
      console.error('[generate-brief]', result.message);
      return NextResponse.json({ error: 'Kunne ikke gemme brief' }, { status: 500 });
    case 'ok':
      return NextResponse.json(result.brief, { status: 200 });
  }
}

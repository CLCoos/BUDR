import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { hasPortalPermission } from '@/lib/portalPermissions';
import { createLoginToken } from '@/lib/residentSessions';
import { isValidUuid } from '@/lib/uuid';

/**
 * POST /api/portal/resident-login-link
 * Personalet udsteder et engangs-login-link til en borger i egen organisation.
 * Linket vises kun i svaret og udløber efter kort tid.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const residentUserId = body?.residentUserId;
  if (typeof residentUserId !== 'string' || !isValidUuid(residentUserId)) {
    return NextResponse.json({ error: 'invalid_resident_id' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (!(await hasPortalPermission('view_360'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: staff } = await supabase
    .from('care_staff')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!staff?.org_id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data: resident } = await supabase
    .from('care_residents')
    .select('user_id, org_id')
    .eq('user_id', residentUserId)
    .eq('org_id', staff.org_id)
    .maybeSingle();
  if (!resident) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const issued = await createLoginToken({
    residentUserId,
    orgId: staff.org_id,
    createdBy: user.id,
  });
  if (!issued) {
    return NextResponse.json({ error: 'token_creation_failed' }, { status: 500 });
  }

  const url = new URL('/api/resident-auth/session', req.nextUrl.origin);
  url.searchParams.set('token', issued.token);
  url.searchParams.set('next', '/park-hub');

  return NextResponse.json({ url: url.toString(), expiresAt: issued.expiresAt.toISOString() });
}

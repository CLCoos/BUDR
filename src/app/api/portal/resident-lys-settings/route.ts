import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { hasPortalPermission } from '@/lib/portalPermissions';
import { isValidUuid } from '@/lib/uuid';

type Ctx = {
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
  orgId: string;
};

/** Personale med adgang til 360-visningen, i borgerens egen organisation. */
async function staffContext(): Promise<Ctx | NextResponse> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
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
  return { supabase, orgId: staff.org_id as string };
}

/**
 * GET /api/portal/resident-lys-settings?residentUserId=…
 * PATCH /api/portal/resident-lys-settings { residentUserId, simpleMode }
 * Personalet slår enkel Lys til eller fra for en borger i egen organisation.
 */
export async function GET(req: NextRequest) {
  const residentUserId = req.nextUrl.searchParams.get('residentUserId');
  if (!residentUserId || !isValidUuid(residentUserId)) {
    return NextResponse.json({ error: 'invalid_resident_id' }, { status: 400 });
  }
  const ctx = await staffContext();
  if (ctx instanceof NextResponse) return ctx;

  const { data } = await ctx.supabase
    .from('care_residents')
    .select('simple_mode')
    .eq('user_id', residentUserId)
    .eq('org_id', ctx.orgId)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ simpleMode: Boolean(data.simple_mode) });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    residentUserId?: unknown;
    simpleMode?: unknown;
  } | null;
  const residentUserId = body?.residentUserId;
  if (typeof residentUserId !== 'string' || !isValidUuid(residentUserId)) {
    return NextResponse.json({ error: 'invalid_resident_id' }, { status: 400 });
  }
  if (typeof body?.simpleMode !== 'boolean') {
    return NextResponse.json({ error: 'invalid_simple_mode' }, { status: 400 });
  }
  const ctx = await staffContext();
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await ctx.supabase
    .from('care_residents')
    .update({ simple_mode: body.simpleMode })
    .eq('user_id', residentUserId)
    .eq('org_id', ctx.orgId)
    .select('simple_mode')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ simpleMode: Boolean(data.simple_mode) });
}

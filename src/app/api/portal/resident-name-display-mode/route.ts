import { NextResponse } from 'next/server';
import { PERMISSIONS } from '@/lib/permissions';
import { hasPortalPermission } from '@/lib/portalPermissions';
import { requirePortalAuth } from '@/lib/portalAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import type { NameDisplayMode } from '@/lib/residents/formatName';

function isMode(value: unknown): value is NameDisplayMode {
  return value === 'first_name_initial' || value === 'full_name' || value === 'initials_only';
}

export async function GET() {
  const user = await requirePortalAuth();
  const supabase = await createServerSupabaseClient();
  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!supabase || !orgId) {
    return NextResponse.json({ error: 'Org mangler' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('organisations')
    .select('resident_name_display_mode')
    .eq('id', orgId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const mode = isMode(data?.resident_name_display_mode)
    ? data.resident_name_display_mode
    : 'first_name_initial';
  return NextResponse.json({ mode });
}

export async function PATCH(req: Request) {
  const user = await requirePortalAuth();
  const canManage = await hasPortalPermission(PERMISSIONS.MANAGE_ROLES);
  if (!canManage) {
    return NextResponse.json({ error: 'Manglende rettighed' }, { status: 403 });
  }
  const supabase = await createServerSupabaseClient();
  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!supabase || !orgId) {
    return NextResponse.json({ error: 'Org mangler' }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as { mode?: unknown };
  if (!isMode(body.mode)) {
    return NextResponse.json({ error: 'Ugyldig mode' }, { status: 400 });
  }
  const { error } = await supabase
    .from('organisations')
    .update({ resident_name_display_mode: body.mode })
    .eq('id', orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, mode: body.mode });
}

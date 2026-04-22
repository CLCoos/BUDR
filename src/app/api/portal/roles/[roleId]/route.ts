import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PERMISSIONS } from '@/lib/permissions';
import { hasPortalPermission } from '@/lib/portalPermissions';

type UpdateRoleBody = { name?: unknown; permissions?: unknown };

type Ctx = { params: Promise<{ roleId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const canManage = await hasPortalPermission(PERMISSIONS.MANAGE_ROLES);
  if (!canManage) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { roleId } = await ctx.params;

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let body: UpdateRoleBody;
  try {
    body = (await req.json()) as UpdateRoleBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const permissions = Array.isArray(body.permissions)
    ? body.permissions.filter((p): p is string => typeof p === 'string' && p.length > 0)
    : null;

  const { data: current } = await supabase
    .from('org_roles')
    .select('id, is_system_role')
    .eq('id', roleId)
    .single();
  if (!current) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (name && !current.is_system_role) {
    updateData.name = name;
  }
  if (permissions) {
    updateData.permissions = permissions;
  }
  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase.from('org_roles').update(updateData).eq('id', roleId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const canManage = await hasPortalPermission(PERMISSIONS.MANAGE_ROLES);
  if (!canManage) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { roleId } = await ctx.params;

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const { data: current } = await supabase
    .from('org_roles')
    .select('id, is_system_role')
    .eq('id', roleId)
    .single();
  if (!current) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (current.is_system_role)
    return NextResponse.json({ error: 'cannot_delete_system_role' }, { status: 400 });

  const { count } = await supabase
    .from('care_staff')
    .select('id', { count: 'exact', head: true })
    .eq('role_id', roleId);
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'role_in_use' }, { status: 400 });
  }

  const { error } = await supabase.from('org_roles').delete().eq('id', roleId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

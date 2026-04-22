import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PERMISSIONS } from '@/lib/permissions';
import { hasPortalPermission } from '@/lib/portalPermissions';

type CreateRoleBody = {
  name?: unknown;
  permissions?: unknown;
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: staff } = await supabase
    .from('care_staff')
    .select('org_id')
    .eq('id', user.id)
    .single();
  if (!staff?.org_id) return NextResponse.json({ error: 'no_org' }, { status: 403 });

  const { data: roles, error } = await supabase
    .from('org_roles')
    .select('id, name, is_system_role, permissions')
    .eq('org_id', staff.org_id)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    roles: (roles ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      is_system_role: r.is_system_role,
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
    })),
  });
}

export async function POST(req: Request) {
  const canManage = await hasPortalPermission(PERMISSIONS.MANAGE_ROLES);
  if (!canManage) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: staff } = await supabase
    .from('care_staff')
    .select('org_id')
    .eq('id', user.id)
    .single();
  if (!staff?.org_id) return NextResponse.json({ error: 'no_org' }, { status: 403 });

  let body: CreateRoleBody;
  try {
    body = (await req.json()) as CreateRoleBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });
  let permissions = Array.isArray(body.permissions)
    ? body.permissions.filter((p): p is string => typeof p === 'string' && p.length > 0)
    : [];
  if (permissions.length === 0) {
    permissions = [
      'view_dashboard',
      'view_residents',
      'write_journal',
      'view_journal',
      'view_360',
      'write_handover',
      'view_handover',
      'send_messages',
      'view_messages',
      'view_medications',
      'view_concern_notes',
      'write_concern_notes',
      'view_crisis_plans',
      'view_park_plans',
    ];
  }

  const { data: role, error: roleError } = await supabase
    .from('org_roles')
    .insert({ org_id: staff.org_id, name, is_system_role: false, permissions })
    .select('id, name, is_system_role, permissions')
    .single();
  if (roleError) return NextResponse.json({ error: roleError.message }, { status: 400 });

  return NextResponse.json({ role: { ...role, permissions } });
}

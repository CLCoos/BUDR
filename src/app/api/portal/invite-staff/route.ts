import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { getStaffPermissions } from '@/lib/auth/getStaffPermissions';
import { hasPermission } from '@/lib/auth/hasPermission';
import { requirePortalAuth } from '@/lib/portalAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { parseStaffOrgId } from '@/lib/staffOrgScope';

type InviteBody = { email?: unknown; name?: unknown; role?: unknown; roleId?: unknown };

/**
 * POST /api/portal/invite-staff
 *
 * Authenticated staff member invites a new colleague to their organisation.
 * - Validates that the inviter has a valid org_id in their JWT metadata.
 * - Calls Supabase Admin inviteUserByEmail with { org_id, display_name } so
 *   the new user is scoped to the same facility on first login.
 * - Best-effort audit log via create_audit_log('staff.invite').
 */
export async function POST(req: Request): Promise<NextResponse> {
  // requirePortalAuth throws a redirect if not authenticated.
  const user = await requirePortalAuth();
  const supabase = await (await import('@/lib/supabase/server')).createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  const permissions = await getStaffPermissions(supabase);
  if (!hasPermission(permissions, PERMISSIONS.INVITE_STAFF)) {
    return NextResponse.json({ error: 'Ingen adgang' }, { status: 403 });
  }

  const { data: staffRow } = await supabase
    .from('care_staff')
    .select('org_id')
    .eq('id', user.id)
    .single();
  const orgId = parseStaffOrgId(staffRow?.org_id ?? null);
  if (!orgId) {
    return NextResponse.json(
      { error: 'Din bruger mangler org_id — kontakt administrator' },
      { status: 403 }
    );
  }

  let body: InviteBody;
  try {
    body = (await req.json()) as InviteBody;
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const roleId = typeof body.roleId === 'string' ? body.roleId : null;
  let role = body.role === 'leder' || body.role === 'medarbejder' ? body.role : 'medarbejder';

  if (!email) {
    return NextResponse.json({ error: 'Email er påkrævet' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Ugyldig email-adresse' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const admin = createClient(url, serviceKey);

  if (roleId) {
    const { data: roleRow } = await admin
      .from('org_roles')
      .select('id, name')
      .eq('id', roleId)
      .eq('org_id', orgId)
      .single();
    if (!roleRow) {
      return NextResponse.json({ error: 'Ugyldig rolle valgt' }, { status: 400 });
    }
    role = roleRow.name;
  }

  // Invite via Supabase Admin API — creates the user row and sends the magic link.
  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      org_id: orgId,
      ...(name ? { display_name: name } : {}),
    },
  });

  if (inviteErr) {
    const msg = inviteErr.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('already been invited')) {
      return NextResponse.json(
        { error: 'Denne email er allerede registreret eller inviteret' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: inviteErr.message }, { status: 400 });
  }

  // Insert into care_staff — best-effort (user exists, magic link pending confirmation).
  if (inviteData?.user?.id) {
    await admin.from('care_staff').insert({
      id: inviteData.user.id,
      org_id: orgId,
      full_name: name || email.split('@')[0],
      role,
      ...(roleId ? { role_id: roleId } : {}),
    });
  }

  // Audit log — best-effort, same pattern as staffAuditLog.ts.
  try {
    const h = await headers();
    const clientIp =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? undefined;

    await admin.rpc('create_audit_log', {
      p_actor_type: 'care_staff',
      p_action: 'staff.invite',
      p_actor_id: user.id,
      p_actor_org_id: orgId,
      p_ip_address: clientIp,
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}

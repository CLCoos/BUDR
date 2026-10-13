import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { careStaffFullName, coarseCareStaffRole } from '@/lib/careStaffRole';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Server mangler Supabase config.' }, { status: 500 });
  }

  const body = (await req.json()) as {
    userId?: string;
    orgId?: string;
    roleId?: string;
  };
  const userId = body.userId?.trim();
  const orgId = body.orgId?.trim();
  const roleId = body.roleId?.trim();
  if (!userId || !orgId || !roleId) {
    return NextResponse.json({ error: 'userId, orgId og roleId er påkrævet.' }, { status: 400 });
  }

  const { data: roleRow } = await admin
    .from('org_roles')
    .select('id,name,org_id')
    .eq('id', roleId)
    .maybeSingle();
  if (!roleRow || roleRow.org_id !== orgId) {
    return NextResponse.json({ error: 'Rollen matcher ikke organisationen.' }, { status: 400 });
  }

  const userRes = await admin.auth.admin.getUserById(userId);
  if (userRes.error || !userRes.data.user) {
    return NextResponse.json(
      { error: userRes.error?.message ?? 'Bruger blev ikke fundet.' },
      { status: 400 }
    );
  }
  const authUser = userRes.data.user;

  const { data: existing, error: existingErr } = await admin
    .from('care_staff')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 400 });
  }

  // care_staff skrives først (med CHECK-sikker rolle og navn), så en fejl ikke efterlader
  // en bruger med org_id i metadata men uden adgang til portalen.
  const role = coarseCareStaffRole(roleRow.name);
  const staffResult = existing
    ? await admin
        .from('care_staff')
        .update({ org_id: orgId, role_id: roleId, role })
        .eq('id', userId)
    : await admin.from('care_staff').insert({
        id: userId,
        org_id: orgId,
        role_id: roleId,
        role,
        full_name: careStaffFullName({
          email: authUser.email,
          user_metadata: (authUser.user_metadata ?? null) as Record<string, unknown> | null,
        }),
      });
  if (staffResult.error) {
    return NextResponse.json({ error: staffResult.error.message }, { status: 400 });
  }

  const updateRes = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...(authUser.user_metadata ?? {}), org_id: orgId },
  });
  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

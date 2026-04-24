import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

  const updateRes = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { org_id: orgId },
  });
  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 400 });
  }

  const { error: staffErr } = await admin.from('care_staff').upsert(
    {
      id: userId,
      org_id: orgId,
      role_id: roleId,
      role: roleRow.name,
    },
    { onConflict: 'id' }
  );
  if (staffErr) {
    return NextResponse.json({ error: staffErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

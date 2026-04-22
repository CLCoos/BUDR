import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { orgId?: string };
  try {
    body = (await req.json()) as { orgId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'Ugyldig JSON' }, { status: 400 });
  }

  const orgId = body.orgId?.trim();
  if (!orgId) {
    return NextResponse.json({ ok: false, error: 'orgId er påkrævet' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { error } = await admin
    .from('organisations')
    .update({ deactivated_at: new Date().toISOString() })
    .eq('id', orgId)
    .is('deactivated_at', null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

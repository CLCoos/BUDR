import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import type { LysNextStep, NextStepStatus } from '@/types/lys';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const ALLOWED_STATUSES: NextStepStatus[] = ['aktiv', 'fuldført', 'sat på pause'];

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const residentId = await getResidentId();
  if (!residentId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'server_not_configured' }, { status: 503 });
  }

  let body: { status?: NextStepStatus };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.status || !ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('lys_next_steps')
    .select('id, resident_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((existing as { resident_id: string }).resident_id !== residentId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const updates: {
    status: NextStepStatus;
    completed_at?: string | null;
    updated_at: string;
  } = {
    status: body.status,
    updated_at: new Date().toISOString(),
  };
  if (body.status === 'fuldført') updates.completed_at = new Date().toISOString();
  if (body.status === 'aktiv') updates.completed_at = null;

  const { data, error } = await supabase
    .from('lys_next_steps')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ step: data as LysNextStep });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const residentId = await getResidentId();
  if (!residentId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'server_not_configured' }, { status: 503 });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('lys_next_steps')
    .select('id, resident_id, created_by_type')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((existing as { resident_id: string }).resident_id !== residentId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if ((existing as { created_by_type: string }).created_by_type !== 'resident') {
    return NextResponse.json({ error: 'staff_created_cannot_delete' }, { status: 403 });
  }

  const { error } = await supabase.from('lys_next_steps').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

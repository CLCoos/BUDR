import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type PlanItemPayload = { title: string; preset_type?: string | null };

/**
 * Lys → planforslag uden staff JWT (service role). Cookie skal matche beboer.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    user_message?: string;
    proposed_items?: PlanItemPayload[];
    preset_type?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const user_message = body.user_message?.trim();
  const proposed_items = body.proposed_items;
  if (!user_message || !proposed_items?.length) {
    return NextResponse.json({ error: 'Mangler besked eller forslag' }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { data: residentRow, error: resErr } = await supabase
    .from('care_residents')
    .select('org_id')
    .eq('user_id', residentId)
    .maybeSingle();

  if (resErr || !residentRow) {
    return NextResponse.json({ error: 'Beboer ikke fundet' }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error: insErr } = await supabase.from('plan_proposals').insert({
    resident_id: residentId,
    org_id: (residentRow as { org_id: string | null }).org_id ?? null,
    plan_date: today,
    user_message,
    proposed_items,
    ai_reasoning: null,
    status: 'pending',
  });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

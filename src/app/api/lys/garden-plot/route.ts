import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Læs haven for beboer — cookie `budr_resident_id`, service role (samme mønster som daily-checkin). */
export async function GET(): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('garden_plots')
    .select(
      'id, resident_id, slot_index, plant_type, plant_name, goal_text, growth_stage, total_water, last_watered_at, is_park_linked, created_at'
    )
    .eq('resident_id', residentId)
    .order('slot_index');

  if (error) {
    console.error('[garden-plot GET]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

type UpsertBody = {
  slot_index: number;
  plant_type: string;
  plant_name: string;
  goal_text?: string;
  growth_stage: number;
  total_water: number;
  last_watered_at: string | null;
  is_park_linked?: boolean;
};

export async function POST(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: UpsertBody;
  try {
    body = (await req.json()) as UpsertBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const row = {
    resident_id: residentId,
    slot_index: body.slot_index,
    plant_type: body.plant_type,
    plant_name: body.plant_name,
    goal_text: body.goal_text ?? '',
    growth_stage: body.growth_stage,
    total_water: body.total_water,
    last_watered_at: body.last_watered_at,
    is_park_linked: body.is_park_linked ?? false,
  };

  const { error } = await supabase.from('garden_plots').upsert(row, {
    onConflict: 'resident_id,slot_index',
  });

  if (error) {
    console.error('[garden-plot POST]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { id: string } & Record<string, unknown>;
  try {
    body = (await req.json()) as { id: string } & Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, ...rest } = body;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: existing, error: fetchErr } = await supabase
    .from('garden_plots')
    .select('resident_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (existing.resident_id !== residentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates: Record<string, unknown> = { ...rest };
  delete updates.id;
  delete updates.resident_id;

  const { error } = await supabase.from('garden_plots').update(updates).eq('id', id);

  if (error) {
    console.error('[garden-plot PATCH]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: existing, error: fetchErr } = await supabase
    .from('garden_plots')
    .select('resident_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (existing.resident_id !== residentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('garden_plots').delete().eq('id', id);

  if (error) {
    console.error('[garden-plot DELETE]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

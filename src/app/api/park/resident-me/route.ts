import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Server-side profil for Lys: cookie `budr_resident_id` + service role (RLS på care_residents for anon). */
export async function GET(): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('care_residents')
    .select('user_id, display_name, onboarding_data, org_id, nickname, color_theme, avatar_url')
    .eq('user_id', residentId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Ikke fundet' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { nickname?: string | null; color_theme?: string | null; avatar_url?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};
  if ('nickname' in body) patch.nickname = body.nickname ?? null;
  if ('color_theme' in body) patch.color_theme = body.color_theme ?? null;
  if ('avatar_url' in body) patch.avatar_url = body.avatar_url ?? null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Ingen felter at opdatere' }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { error } = await supabase.from('care_residents').update(patch).eq('user_id', residentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

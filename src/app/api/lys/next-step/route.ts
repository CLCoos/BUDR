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

const ALLOWED_LIST_STATUSES: NextStepStatus[] = ['aktiv', 'fuldført', 'sat på pause'];

export async function GET(req: NextRequest) {
  const residentId = await getResidentId();
  if (!residentId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'server_not_configured' }, { status: 503 });
  }

  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status');
  const statuses: NextStepStatus[] = statusParam
    ? (statusParam.split(',') as NextStepStatus[]).filter((s) => ALLOWED_LIST_STATUSES.includes(s))
    : ['aktiv'];

  if (statuses.length === 0) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('lys_next_steps')
    .select('*')
    .eq('resident_id', residentId)
    .in('status', statuses)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ steps: (data ?? []) as LysNextStep[] });
}

export async function POST(req: NextRequest) {
  const residentId = await getResidentId();
  if (!residentId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'server_not_configured' }, { status: 503 });
  }

  let body: {
    title?: string;
    description?: string;
    related_chime_domain?: string | null;
    related_reflection_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: 'title_required' }, { status: 400 });

  const description = body.description?.trim() || null;

  const allowedDomains = ['connectedness', 'hope', 'identity', 'meaning', 'empowerment'];
  let relatedChimeDomain: string | null = null;
  if (body.related_chime_domain !== undefined && body.related_chime_domain !== null) {
    if (
      typeof body.related_chime_domain !== 'string' ||
      !allowedDomains.includes(body.related_chime_domain)
    ) {
      return NextResponse.json({ error: 'invalid_chime_domain' }, { status: 400 });
    }
    relatedChimeDomain = body.related_chime_domain;
  }

  let relatedReflectionId: string | null = null;
  if (body.related_reflection_id !== undefined && body.related_reflection_id !== null) {
    if (
      typeof body.related_reflection_id !== 'string' ||
      body.related_reflection_id.trim() === ''
    ) {
      return NextResponse.json({ error: 'invalid_reflection_id' }, { status: 400 });
    }
    const { data: reflection, error: reflErr } = await supabase
      .from('lys_reflection')
      .select('id, resident_id')
      .eq('id', body.related_reflection_id)
      .maybeSingle();
    if (reflErr) {
      return NextResponse.json({ error: reflErr.message }, { status: 500 });
    }
    if (!reflection || (reflection as { resident_id: string }).resident_id !== residentId) {
      return NextResponse.json({ error: 'invalid_reflection_id' }, { status: 400 });
    }
    relatedReflectionId = body.related_reflection_id;
  }

  const { data: resident, error: residentErr } = await supabase
    .from('care_residents')
    .select('org_id')
    .eq('user_id', residentId)
    .maybeSingle();

  if (residentErr) {
    return NextResponse.json({ error: residentErr.message }, { status: 500 });
  }
  if (!resident) {
    return NextResponse.json({ error: 'resident_not_found' }, { status: 404 });
  }

  const orgId = (resident as { org_id?: string | null }).org_id ?? null;

  const { data, error } = await supabase
    .from('lys_next_steps')
    .insert({
      resident_id: residentId,
      org_id: orgId,
      created_by_type: 'resident',
      title,
      description,
      status: 'aktiv',
      related_chime_domain: relatedChimeDomain,
      related_reflection_id: relatedReflectionId,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ step: data as LysNextStep });
}

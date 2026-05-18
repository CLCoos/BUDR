import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { VumAssessmentRow, VumAssessmentStatus } from '@/lib/vum/vumTypes';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const residentId = request.nextUrl.searchParams.get('resident_id')?.trim();
  if (!residentId || !isUuid(residentId)) {
    return NextResponse.json({ error: 'invalid_resident_id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('vum_assessments')
    .select('*')
    .eq('resident_id', residentId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assessments: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const residentId =
    body !== null &&
    typeof body === 'object' &&
    'resident_id' in body &&
    typeof (body as Record<string, unknown>).resident_id === 'string'
      ? ((body as Record<string, unknown>).resident_id as string).trim()
      : null;

  if (!residentId || !isUuid(residentId)) {
    return NextResponse.json({ error: 'invalid_resident_id' }, { status: 400 });
  }

  const { data: resident, error: residentErr } = await supabase
    .from('care_residents')
    .select('org_id')
    .eq('user_id', residentId)
    .single();

  if (residentErr || !resident?.org_id) {
    return NextResponse.json({ error: 'resident_not_found' }, { status: 404 });
  }

  const referralSource =
    body !== null &&
    typeof body === 'object' &&
    typeof (body as Record<string, unknown>).referral_source === 'string'
      ? ((body as Record<string, unknown>).referral_source as string).trim() || null
      : null;

  const casePurpose =
    body !== null &&
    typeof body === 'object' &&
    typeof (body as Record<string, unknown>).case_purpose === 'string'
      ? ((body as Record<string, unknown>).case_purpose as string).trim() || null
      : null;

  const { data: inserted, error: insertErr } = await supabase
    .from('vum_assessments')
    .insert({
      org_id: resident.org_id,
      resident_id: residentId,
      case_opened_by: user.id,
      referral_source: referralSource,
      case_purpose: casePurpose,
      status: 'draft' satisfies VumAssessmentStatus,
    })
    .select('*')
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ assessment: inserted }, { status: 201 });
}

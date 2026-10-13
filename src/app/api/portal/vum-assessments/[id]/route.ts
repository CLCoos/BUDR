import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  syncFunctionLevelsFromThemes,
  themeColumnForNumber,
  type VumAssessmentRow,
  type VumAssessmentStatus,
  type VumThemePayload,
  parseThemePayload,
} from '@/lib/vum/vumTypes';
import { buildVumExportJson } from '@/lib/vum/exportVumAssessment';

const VUM_NOTES_MAX = 4000;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

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

  const exportFormat = request.nextUrl.searchParams.get('format');

  const { data, error } = await supabase.from('vum_assessments').select('*').eq('id', id).single();

  if (error || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (exportFormat === 'json') {
    return NextResponse.json(buildVumExportJson(data as unknown as VumAssessmentRow));
  }

  return NextResponse.json({ assessment: data });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

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

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { data: existing, error: loadErr } = await supabase
    .from('vum_assessments')
    .select('*')
    .eq('id', id)
    .single();

  if (loadErr || !existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (existing.status === 'archived') {
    return NextResponse.json({ error: 'archived' }, { status: 409 });
  }

  const patch: Record<string, unknown> = {};

  if (typeof body.status === 'string') {
    const status = body.status as VumAssessmentStatus;
    if (status === 'draft' || status === 'active' || status === 'archived') {
      patch.status = status;
    }
  }

  if (typeof body.referral_source === 'string' || body.referral_source === null) {
    patch.referral_source = body.referral_source?.trim().slice(0, 2000) || null;
  }
  if (typeof body.case_purpose === 'string' || body.case_purpose === null) {
    patch.case_purpose = body.case_purpose?.trim().slice(0, 2000) || null;
  }
  if (typeof body.next_followup_due_at === 'string' || body.next_followup_due_at === null) {
    patch.next_followup_due_at = body.next_followup_due_at;
  }

  if (isRecord(body.theme)) {
    const themeNumber = body.theme.number;
    const payload = body.theme.payload;
    if (typeof themeNumber === 'number' && isRecord(payload)) {
      const col = themeColumnForNumber(themeNumber);
      if (col) {
        // Kun felter, der faktisk sendes, overskrives; resten af temaet bevares.
        const merged: VumThemePayload = {
          ...parseThemePayload(existing[col]),
          updated_at: new Date().toISOString(),
        };
        if (typeof payload.notes === 'string') {
          merged.notes = payload.notes.slice(0, VUM_NOTES_MAX);
        }
        if (
          typeof payload.level === 'number' &&
          Number.isInteger(payload.level) &&
          payload.level >= 0 &&
          payload.level <= 4
        ) {
          merged.level = payload.level as VumThemePayload['level'];
        }
        if (isRecord(payload.inspiration)) {
          merged.inspiration = {
            ...(merged.inspiration ?? {}),
            ...Object.fromEntries(
              Object.entries(payload.inspiration)
                .filter((e): e is [string, string] => typeof e[1] === 'string')
                .slice(0, 40)
                .map(([k, v]) => [k.slice(0, 80), v.slice(0, VUM_NOTES_MAX)])
            ),
          };
        }
        patch[col] = merged;
      }
    }
  }

  if (Array.isArray(body.goals)) {
    if (body.goals.length > 50 || !body.goals.every(isRecord)) {
      return NextResponse.json({ error: 'invalid_goals' }, { status: 400 });
    }
    patch.goals = body.goals;
  }

  const mergedRow = { ...existing, ...patch } as VumAssessmentRow;
  patch.function_levels = syncFunctionLevelsFromThemes(mergedRow);

  const { data: updated, error: updateErr } = await supabase
    .from('vum_assessments')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ assessment: updated });
}

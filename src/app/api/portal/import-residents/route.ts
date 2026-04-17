import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseStaffOrgId } from '@/lib/staffOrgScope';

const MAX_BATCH = 100;

interface ResidentInput {
  display_name?: unknown;
  nickname?: unknown;
  room?: unknown;
  move_in_date?: unknown;
  primary_contact?: unknown;
  primary_contact_phone?: unknown;
  primary_contact_relation?: unknown;
}

interface ImportError {
  row: number;
  name: string;
  error: string;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  const server = await createServerSupabaseClient();
  if (!server) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: staffRow } = await server
    .from('care_staff')
    .select('org_id')
    .eq('id', user.id)
    .single();
  const orgId = parseStaffOrgId(staffRow?.org_id ?? null);
  if (!orgId) {
    return NextResponse.json({ error: 'no_org' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const residents =
    body !== null &&
    typeof body === 'object' &&
    'residents' in body &&
    Array.isArray((body as Record<string, unknown>).residents)
      ? ((body as Record<string, unknown>).residents as ResidentInput[])
      : null;

  if (!residents) {
    return NextResponse.json({ error: 'missing_residents' }, { status: 400 });
  }
  if (residents.length > MAX_BATCH) {
    return NextResponse.json({ error: `Max ${MAX_BATCH} beboere per request` }, { status: 400 });
  }

  const supabase = getServiceClient();
  let imported = 0;
  const errors: ImportError[] = [];

  for (let i = 0; i < residents.length; i++) {
    const r = residents[i];
    const name = typeof r.display_name === 'string' ? r.display_name.trim() : '';
    if (!name) {
      errors.push({ row: i + 1, name: '(tom)', error: 'display_name er påkrævet' });
      continue;
    }

    const parts = name.split(/\s+/).filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');

    const onboarding_data = {
      avatar_initials: initials,
      room: typeof r.room === 'string' ? r.room.trim() || '—' : '—',
      move_in_date: typeof r.move_in_date === 'string' ? r.move_in_date.trim() || null : null,
      primary_contact:
        typeof r.primary_contact === 'string' ? r.primary_contact.trim() || null : null,
      primary_contact_phone:
        typeof r.primary_contact_phone === 'string' ? r.primary_contact_phone.trim() || null : null,
      primary_contact_relation:
        typeof r.primary_contact_relation === 'string'
          ? r.primary_contact_relation.trim() || null
          : null,
    };

    const { error } = await supabase.from('care_residents').insert({
      display_name: name,
      nickname: typeof r.nickname === 'string' && r.nickname.trim() ? r.nickname.trim() : null,
      onboarding_data,
      org_id: orgId,
      preferred_language: 'da',
      color_theme: 'purple',
      simple_mode: false,
    });

    if (error) {
      errors.push({ row: i + 1, name, error: error.message });
    } else {
      imported++;
    }
  }

  return NextResponse.json({ imported, errors });
}

import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseStaffOrgId } from '@/lib/staffOrgScope';

const MAX_BATCH = 100;

interface ResidentInput {
  display_name?: unknown;
  nickname?: unknown;
}

interface ImportError {
  row: number;
  name: string;
  error: string;
}

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request): Promise<Response | NextResponse> {
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

  const admin = getServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: 'service_role_required' }, { status: 503 });
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      };

      let imported = 0;
      const errors: ImportError[] = [];

      for (let i = 0; i < residents.length; i++) {
        const r = residents[i];
        const name = typeof r.display_name === 'string' ? r.display_name.trim() : '';
        if (!name) {
          const err: ImportError = {
            row: i + 1,
            name: '(tom)',
            error: 'display_name er påkrævet',
          };
          errors.push(err);
          send({
            type: 'row',
            index: i,
            ok: false,
            display_name: '(tom)',
            error: err.error,
          });
          continue;
        }

        const nickRaw = typeof r.nickname === 'string' ? r.nickname.trim() : '';
        const nickname = nickRaw ? nickRaw : null;

        const parts = name.split(/\s+/).filter(Boolean);
        const initials = parts
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? '')
          .join('');

        const onboarding_data = {
          avatar_initials: initials || '?',
          room: '—',
          move_in_date: null as string | null,
          primary_contact: null as string | null,
          primary_contact_phone: null as string | null,
          primary_contact_relation: null as string | null,
        };

        const user_id = randomUUID();

        const { error } = await admin.from('care_residents').insert({
          user_id,
          display_name: name,
          nickname,
          org_id: orgId,
          onboarding_data,
          preferred_language: 'da',
          color_theme: 'purple',
          simple_mode: false,
        });

        if (error) {
          const err: ImportError = { row: i + 1, name, error: error.message };
          errors.push(err);
          send({ type: 'row', index: i, ok: false, display_name: name, error: error.message });
        } else {
          imported++;
          send({ type: 'row', index: i, ok: true, display_name: name });
        }
      }

      send({ type: 'done', imported, errors });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import {
  buildStaffMessageJournalRow,
  isDemoResidentId,
  omitMissingJournalInsertColumn,
  staffMessageNotificationRow,
} from '@/lib/lysStaffMessage';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { message: string };
  try {
    body = (await req.json()) as { message: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = body.message?.trim();
  if (!text) {
    return NextResponse.json({ error: 'Besked må ikke være tom' }, { status: 400 });
  }

  // Demo-session: keep the UI flow without writing invalid UUID FKs.
  if (isDemoResidentId(residentId)) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { data: resident, error: residentErr } = await supabase
    .from('care_residents')
    .select('display_name, org_id')
    .eq('user_id', residentId)
    .maybeSingle();

  if (residentErr) {
    return NextResponse.json({ error: residentErr.message }, { status: 500 });
  }
  if (!resident) {
    return NextResponse.json({ error: 'Resident ikke fundet' }, { status: 401 });
  }

  const displayName = (resident as { display_name?: string | null }).display_name ?? null;
  const residentOrgId = (resident as { org_id?: string } | null)?.org_id ?? null;
  const nowIso = new Date().toISOString();

  let payload: Record<string, unknown> = buildStaffMessageJournalRow({
    residentId,
    displayName,
    entryText: text,
    orgId: residentOrgId,
    nowIso,
  });

  let { error } = await supabase.from('journal_entries').insert(payload);
  while (error) {
    const stripped = omitMissingJournalInsertColumn(payload, error.message);
    if (!stripped.omitted) break;
    payload = stripped.payload;
    ({ error } = await supabase.from('journal_entries').insert(payload));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: notifyErr } = await supabase.from('care_portal_notifications').insert(
    staffMessageNotificationRow({
      residentId,
      displayName,
      entryText: text,
      orgId: residentOrgId,
    })
  );

  if (notifyErr) {
    // Journal row is already persisted — do not 500 (retry would duplicate the note).
    console.error('[message-staff] notification insert failed:', notifyErr.message);
  }

  return NextResponse.json({ ok: true });
}

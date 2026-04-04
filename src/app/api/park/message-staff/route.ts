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

  const supabase = getServiceClient();

  // Look up resident name for the journal entry
  const { data: resident } = await supabase
    .from('care_residents')
    .select('display_name')
    .eq('user_id', residentId)
    .maybeSingle();

  const staffName = resident?.display_name
    ? `Beboer: ${resident.display_name as string}`
    : 'Beboer';

  const nowIso = new Date().toISOString();
  const { error } = await supabase.from('journal_entries').insert({
    resident_id: residentId,
    staff_id: null,
    staff_name: staffName,
    entry_text: text,
    category: 'Besked fra beboer',
    journal_status: 'godkendt',
    approved_at: nowIso,
    approved_by: null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire notification so staff see the message in the alerts panel
  const residentLabel = resident?.display_name ? (resident.display_name as string) : 'En beboer';
  const excerpt = text.length > 80 ? `${text.slice(0, 77)}…` : text;
  await supabase.from('care_portal_notifications').insert({
    resident_id: residentId,
    type: 'besked',
    detail: `${residentLabel}: «${excerpt}»`,
    severity: 'gul',
    source_table: 'journal_entries',
  });

  return NextResponse.json({ ok: true });
}

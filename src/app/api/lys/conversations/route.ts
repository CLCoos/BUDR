import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import { sanitizeLysConversationMessages, titleFromLysMessages } from '@/lib/lys/lysConversations';
import { isResidentUuidForCloud } from '@/lib/residentUuid';
import { isValidUuid } from '@/lib/uuid';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Lys-samtaler for cookie-beboere. Browser-klienten har ikke JWT, og RLS på
 * lys_conversations kræver auth.uid() = resident_id — derfor service role.
 */
export async function GET(): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isResidentUuidForCloud(residentId)) {
    return NextResponse.json({ conversations: [], demo: true });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('lys_conversations')
    .select('id, title, messages, updated_at')
    .eq('resident_id', residentId)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[lys/conversations GET]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: data ?? [] });
}

type PostBody = {
  id?: unknown;
  messages?: unknown;
  title?: unknown;
};

export async function POST(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const messages = sanitizeLysConversationMessages(body.messages);
  if (!messages || messages.length < 2) {
    return NextResponse.json({ error: 'Mangler samtale' }, { status: 400 });
  }

  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim().slice(0, 60)
      : titleFromLysMessages(messages);

  if (!isResidentUuidForCloud(residentId)) {
    return NextResponse.json({ ok: true, demo: true, id: null });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const existingId = typeof body.id === 'string' && isValidUuid(body.id) ? body.id : null;

  if (existingId) {
    const { data: existing, error: fetchErr } = await supabase
      .from('lys_conversations')
      .select('id, resident_id')
      .eq('id', existingId)
      .maybeSingle();
    if (fetchErr) {
      console.error('[lys/conversations POST fetch]', fetchErr.message);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!existing || (existing as { resident_id: string }).resident_id !== residentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: updErr } = await supabase
      .from('lys_conversations')
      .update({
        messages,
        title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingId)
      .eq('resident_id', residentId);

    if (updErr) {
      console.error('[lys/conversations POST update]', updErr.message);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: existingId });
  }

  const { data: inserted, error: insErr } = await supabase
    .from('lys_conversations')
    .insert({
      resident_id: residentId,
      messages,
      title,
    })
    .select('id')
    .single();

  if (insErr) {
    console.error('[lys/conversations POST insert]', insErr.message);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: (inserted as { id: string }).id });
}

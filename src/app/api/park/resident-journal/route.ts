import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import { isResidentUuidForCloud } from '@/lib/residentUuid';
import type { JournalEntry } from '@/types/local';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

const CATEGORY = 'Lys journal';
const META_PREFIX = 'BUDR_META:';
const MAX_TEXT = 20_000;

type MetaV1 = {
  v: 1;
  mood?: number;
  feelings?: string[];
  privacy: 'private' | 'shared';
  mode: 'write' | 'voice';
  prompt?: string | null;
};

function encodeEntryText(text: string, meta: MetaV1): string {
  return `${META_PREFIX}${JSON.stringify(meta)}\n${text}`;
}

function decodeRow(row: { id: string; entry_text: string; created_at: string }): JournalEntry {
  const t = row.entry_text;
  if (t.startsWith(META_PREFIX)) {
    const nl = t.indexOf('\n');
    if (nl > 0) {
      try {
        const meta = JSON.parse(t.slice(META_PREFIX.length, nl)) as MetaV1;
        return {
          id: row.id,
          date: row.created_at,
          mode: meta.mode ?? 'write',
          text: t.slice(nl + 1),
          mood: meta.mood,
          feelings: meta.feelings,
          privacy: meta.privacy ?? 'private',
          prompt: meta.prompt ?? undefined,
        };
      } catch {
        /* fall through */
      }
    }
  }
  return {
    id: row.id,
    date: row.created_at,
    mode: 'write',
    text: t,
  };
}

export async function GET(): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isResidentUuidForCloud(residentId)) {
    return NextResponse.json({ error: 'Not a cloud resident' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, entry_text, created_at')
    .eq('resident_id', residentId)
    .eq('category', CATEGORY)
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    console.error('[resident-journal GET]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data ?? []).map((row) =>
    decodeRow(row as { id: string; entry_text: string; created_at: string })
  );
  return NextResponse.json({ data: entries });
}

type PostBody = {
  text?: string;
  mode?: 'write' | 'voice';
  mood?: number;
  feelings?: string[];
  privacy?: 'private' | 'shared';
  prompt?: string | null;
};

export async function POST(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isResidentUuidForCloud(residentId)) {
    return NextResponse.json({ error: 'Not a cloud resident' }, { status: 400 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'Tekst må ikke være tom' }, { status: 400 });
  }
  if (text.length > MAX_TEXT) {
    return NextResponse.json({ error: 'Teksten er for lang' }, { status: 400 });
  }

  const privacy = body.privacy === 'shared' ? 'shared' : 'private';
  const mode = body.mode === 'voice' ? 'voice' : 'write';
  const meta: MetaV1 = {
    v: 1,
    mood: typeof body.mood === 'number' ? body.mood : undefined,
    feelings: Array.isArray(body.feelings) ? body.feelings : undefined,
    privacy,
    mode,
    prompt: body.prompt ?? undefined,
  };

  const supabase = getServiceClient();

  const { data: resident } = await supabase
    .from('care_residents')
    .select('display_name, org_id')
    .eq('user_id', residentId)
    .maybeSingle();

  const staffName = resident?.display_name
    ? `Beboer (Lys): ${resident.display_name as string}`
    : 'Beboer (Lys)';

  const nowIso = new Date().toISOString();
  const journal_status = privacy === 'shared' ? 'godkendt' : 'kladde';

  const entry_text = encodeEntryText(text, meta);

  const { error: insertError } = await supabase.from('journal_entries').insert({
    resident_id: residentId,
    staff_id: null,
    staff_name: staffName,
    entry_text,
    category: CATEGORY,
    journal_status,
    approved_at: privacy === 'shared' ? nowIso : null,
    approved_by: null,
    org_id: (resident as { org_id?: string } | null)?.org_id ?? null,
  });

  if (insertError) {
    console.error('[resident-journal POST]', insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { count, error: countError } = await supabase
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('resident_id', residentId)
    .eq('category', CATEGORY);

  if (countError) {
    console.error('[resident-journal POST count]', countError.message);
  }

  return NextResponse.json({ ok: true, lysEntryCount: count ?? 0 });
}

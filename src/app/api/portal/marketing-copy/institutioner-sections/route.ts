import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requirePortalAuth } from '@/lib/portalAuth';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import {
  DEFAULT_INSTITUTIONER_SECTIONS_COPY,
  sanitizeInstitutionerSectionsCopy,
} from '@/lib/marketing/institutionerSectionsCms';
import { appendRevision, sanitizeRevisions } from '@/lib/marketing/marketingCmsHistory';

type Body = { draft?: unknown; publish?: unknown; rollback_revision_id?: unknown };
const ROW_KEY = 'institutioner.sections_copy';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function GET(): Promise<NextResponse> {
  const user = await requirePortalAuth();
  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!orgId) return NextResponse.json({ error: 'Manglende org_id' }, { status: 403 });

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });

  const { data, error } = await admin
    .from('marketing_content_blocks')
    .select('draft, published, updated_at, published_at, revisions')
    .eq('key', ROW_KEY)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    draft: sanitizeInstitutionerSectionsCopy(data?.draft ?? DEFAULT_INSTITUTIONER_SECTIONS_COPY),
    published: data?.published ? sanitizeInstitutionerSectionsCopy(data.published) : null,
    updated_at: data?.updated_at ?? null,
    published_at: data?.published_at ?? null,
    revisions: sanitizeRevisions(data?.revisions).map((r) => ({
      id: r.id,
      created_at: r.created_at,
      actor_id: r.actor_id,
      action: r.action,
      snapshot: sanitizeInstitutionerSectionsCopy(r.snapshot),
    })),
  });
}

export async function PUT(req: Request): Promise<NextResponse> {
  const user = await requirePortalAuth();
  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!orgId) return NextResponse.json({ error: 'Manglende org_id' }, { status: 403 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });

  const rollbackRevisionId =
    typeof body.rollback_revision_id === 'string' && body.rollback_revision_id.trim()
      ? body.rollback_revision_id
      : null;
  const publish = body.publish === true;
  const nowIso = new Date().toISOString();
  const { data: row, error: rowError } = await admin
    .from('marketing_content_blocks')
    .select('draft, revisions')
    .eq('key', ROW_KEY)
    .maybeSingle();
  if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 });

  const revisions = sanitizeRevisions(row?.revisions);
  const fallbackDraft = sanitizeInstitutionerSectionsCopy(
    row?.draft ?? DEFAULT_INSTITUTIONER_SECTIONS_COPY
  );
  const rollbackTarget = rollbackRevisionId
    ? revisions.find((r) => r.id === rollbackRevisionId)
    : null;
  const draft = rollbackTarget
    ? sanitizeInstitutionerSectionsCopy(rollbackTarget.snapshot)
    : sanitizeInstitutionerSectionsCopy(body.draft ?? fallbackDraft);

  const payload: Record<string, unknown> = {
    key: ROW_KEY,
    draft,
    updated_at: nowIso,
    updated_by: user.id,
  };
  if (rollbackTarget || publish) {
    payload.published = draft;
    payload.published_at = nowIso;
    payload.published_by = user.id;
  }
  payload.revisions = appendRevision(revisions, {
    actor_id: user.id,
    action: rollbackTarget ? 'rollback' : publish ? 'publish' : 'draft_save',
    snapshot: draft,
  });

  const { error } = await admin
    .from('marketing_content_blocks')
    .upsert(payload, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, rollback_applied: !!rollbackTarget });
}

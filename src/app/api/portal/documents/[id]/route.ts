import { NextRequest, NextResponse } from 'next/server';
import { PERMISSIONS } from '@/lib/permissions';
import { sanitizeSectionSources } from '@/lib/documents/citations';
import {
  getDocumentType,
  isValidDate,
  sanitizeMeta,
  sanitizeSections,
  validatePeriod,
} from '@/lib/documents/registry';
import type { DocumentMeta, DocumentSectionSources, DocumentSections } from '@/lib/documents/types';
import { UUID_RE, optionalText, readJson, requireStaff } from '../_auth';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/portal/documents/[id]
 * Dokumentet, dets historik, navne på personale og oplysninger til print (borger, bosted, logo).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await requireStaff(PERMISSIONS.VIEW_360);
  if ('error' in ctx) return ctx.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const { data: doc, error } = await ctx.supabase
    .from('resident_documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [eventsRes, staffRes, orgRes] = await Promise.all([
    ctx.supabase
      .from('resident_document_events')
      .select('id, document_id, action, actor_id, created_at, detail')
      .eq('document_id', id)
      .order('created_at', { ascending: true })
      .limit(500),
    ctx.supabase.from('care_staff').select('id, full_name, role').eq('org_id', ctx.orgId),
    ctx.supabase.from('organisations').select('name, logo_url').eq('id', ctx.orgId).maybeSingle(),
  ]);

  // Øjebliksbilleder er store; listen får kun versionsnummeret, resten hentes ved behov.
  const events = (eventsRes.data ?? []).map((e) => ({
    ...e,
    detail:
      e.action === 'godkendt'
        ? { version: (e.detail as Record<string, unknown>)?.version ?? null }
        : e.detail,
  }));

  return NextResponse.json({
    document: doc,
    events,
    staff: staffRes.data ?? [],
    org: orgRes.data ?? null,
    canApprove: ctx.permissions.includes(PERMISSIONS.APPROVE_JOURNAL),
    me: ctx.user.id,
  });
}

type PatchArgs = {
  sections?: DocumentSections;
  section_sources?: DocumentSectionSources;
  meta?: DocumentMeta;
  due_date?: string | null;
  responsible_id?: string | null;
  title?: string | null;
};

/** Funktionen findes først, når migration 20261015160000 er kørt. */
function isMissingPatchFunction(error: { code?: string; message?: string }): boolean {
  if (error.code === 'PGRST202' || error.code === '42883') return true;
  const message = error.message?.toLowerCase() ?? '';
  return (
    message.includes('resident_documents_apply_patch') &&
    (message.includes('could not find') ||
      message.includes('does not exist') ||
      message.includes('schema cache'))
  );
}

function rowFromRpc(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const row = data[0];
    return row && typeof row === 'object' ? (row as Record<string, unknown>) : null;
  }
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  return null;
}

/**
 * PATCH /api/portal/documents/[id]
 * Body (alle valgfri): { sections, section_sources, meta, due_date, responsible_id, title }
 * Afsnit, kilder og metadata flettes ind i rækken i databasen (ikke som et helt
 * øjebliksbillede), så to gem ikke kan slette hinandens felter. Godkendte dokumenter er låst.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await requireStaff(PERMISSIONS.WRITE_JOURNAL);
  if ('error' in ctx) return ctx.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });

  const { data: current, error: readErr } = await ctx.supabase
    .from('resident_documents')
    .select('doc_type, status, sections, section_sources, meta')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const type = getDocumentType(current.doc_type as string);
  if (!type) return NextResponse.json({ error: 'Ukendt dokumenttype' }, { status: 400 });
  if (current.status !== 'kladde' && current.status !== 'til_godkendelse') {
    return NextResponse.json({ error: 'Dokumentet er godkendt og låst' }, { status: 409 });
  }

  const patch: PatchArgs = {};
  if (body.sections !== undefined) {
    const sections = sanitizeSections(type, body.sections);
    if (Object.keys(sections).length > 0) patch.sections = sections;
  }
  if (body.section_sources !== undefined) {
    const keys = type.sections.map((s) => s.key);
    const sources = sanitizeSectionSources(keys, body.section_sources);
    if (Object.keys(sources).length > 0) patch.section_sources = sources;
  }
  if (body.meta !== undefined) {
    const res = sanitizeMeta(type, body.meta, true);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    const merged = { ...(current.meta as DocumentMeta), ...res.meta };
    const periodErr = validatePeriod(type, merged);
    if (periodErr) return NextResponse.json({ error: periodErr }, { status: 400 });
    if (Object.keys(res.meta).length > 0) patch.meta = res.meta;
  }
  if (body.due_date !== undefined) {
    if (body.due_date === null || body.due_date === '') patch.due_date = null;
    else if (isValidDate(body.due_date)) patch.due_date = body.due_date;
    else return NextResponse.json({ error: 'Ugyldig frist' }, { status: 400 });
  }
  if (body.responsible_id !== undefined) {
    if (body.responsible_id === null) patch.responsible_id = null;
    else if (typeof body.responsible_id === 'string' && UUID_RE.test(body.responsible_id)) {
      const { data: staff } = await ctx.supabase
        .from('care_staff')
        .select('id')
        .eq('id', body.responsible_id)
        .eq('org_id', ctx.orgId)
        .maybeSingle();
      if (!staff) return NextResponse.json({ error: 'Ukendt medarbejder' }, { status: 400 });
      patch.responsible_id = body.responsible_id;
    } else return NextResponse.json({ error: 'Ukendt medarbejder' }, { status: 400 });
  }
  const title = optionalText(body.title, 200);
  if (title !== undefined) patch.title = title;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Intet at opdatere' }, { status: 400 });
  }

  const rpc = await ctx.supabase.rpc('resident_documents_apply_patch', {
    p_id: id,
    p_sections: patch.sections ?? null,
    p_section_sources: patch.section_sources ?? null,
    p_meta: patch.meta ?? null,
    p_due_date: patch.due_date ?? null,
    p_set_due_date: patch.due_date !== undefined,
    p_responsible_id: patch.responsible_id ?? null,
    p_set_responsible: patch.responsible_id !== undefined,
    p_title: patch.title ?? null,
    p_set_title: patch.title !== undefined,
  });
  if (!rpc.error) {
    const row = rowFromRpc(rpc.data);
    if (!row) return NextResponse.json({ error: 'Ingen adgang' }, { status: 403 });
    return NextResponse.json({ document: row });
  }
  if (!isMissingPatchFunction(rpc.error)) {
    return NextResponse.json({ error: rpc.error.message }, { status: 500 });
  }

  // Migrationen er ikke kørt endnu: samme fletning, men læst i appen. Overlappende
  // kald kan stadig tabe felter, indtil funktionen findes. Editoren sender dem i rækkefølge.
  const update: Record<string, unknown> = {};
  if (patch.sections) {
    update.sections = { ...sanitizeSections(type, current.sections), ...patch.sections };
  }
  if (patch.section_sources) {
    const keys = type.sections.map((s) => s.key);
    update.section_sources = {
      ...sanitizeSectionSources(keys, current.section_sources),
      ...patch.section_sources,
    };
  }
  if (patch.meta) update.meta = { ...(current.meta as DocumentMeta), ...patch.meta };
  if (patch.due_date !== undefined) update.due_date = patch.due_date;
  if (patch.responsible_id !== undefined) update.responsible_id = patch.responsible_id;
  if (patch.title !== undefined) update.title = patch.title;

  const { data, error } = await ctx.supabase
    .from('resident_documents')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Ingen adgang' }, { status: 403 });
  return NextResponse.json({ document: data });
}

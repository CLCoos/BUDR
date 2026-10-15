import { NextRequest, NextResponse } from 'next/server';
import { PERMISSIONS } from '@/lib/permissions';
import { UUID_RE, requireStaff } from '../../_auth';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/portal/documents/[id]/new-version
 * Laver en ny kladde ud fra et godkendt dokument. Den gamle version markeres som erstattet
 * (af databasen) og kan stadig læses i historikken.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const ctx = await requireStaff(PERMISSIONS.WRITE_JOURNAL);
  if ('error' in ctx) return ctx.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const { data: prev, error: readErr } = await ctx.supabase
    .from('resident_documents')
    .select('org_id, resident_id, doc_type, status, title, meta, sections, section_sources')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!prev || prev.org_id !== ctx.orgId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (prev.status !== 'godkendt') {
    return NextResponse.json(
      { error: 'Kun det seneste godkendte dokument kan få en ny version' },
      { status: 409 }
    );
  }

  const { data, error } = await ctx.supabase
    .from('resident_documents')
    .insert({
      org_id: prev.org_id,
      resident_id: prev.resident_id,
      doc_type: prev.doc_type,
      previous_id: id,
      title: prev.title,
      meta: prev.meta,
      sections: prev.sections,
      section_sources: prev.section_sources,
      responsible_id: ctx.user.id,
      created_by: ctx.user.id,
    })
    .select('*')
    .single();
  if (error) {
    const conflict = error.code === '23505';
    return NextResponse.json(
      { error: conflict ? 'Der findes allerede en nyere version' : error.message },
      { status: conflict ? 409 : 500 }
    );
  }
  return NextResponse.json({ document: data }, { status: 201 });
}

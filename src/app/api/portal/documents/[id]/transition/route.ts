import { NextRequest, NextResponse } from 'next/server';
import { PERMISSIONS } from '@/lib/permissions';
import { getDocumentType, incompleteSections } from '@/lib/documents/registry';
import type { DocumentSections } from '@/lib/documents/types';
import { UUID_RE, optionalText, readJson, requireStaff } from '../../_auth';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/portal/documents/[id]/transition
 * Body: { action: 'submit' | 'return' | 'approve', note? }
 *   submit  — kladde sendes til godkendelse (alle afsnit skal have tekst)
 *   return  — sendes tilbage til kladde, evt. med en note til den ansvarlige
 *   approve — godkendes og låses (kræver approve_journal; ingen tomme afsnit eller markeringer)
 */
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireStaff(PERMISSIONS.WRITE_JOURNAL);
  if ('error' in ctx) return ctx.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  const action = body.action;
  if (action !== 'submit' && action !== 'return' && action !== 'approve') {
    return NextResponse.json({ error: 'Ukendt handling' }, { status: 400 });
  }

  const { data: doc, error: readErr } = await ctx.supabase
    .from('resident_documents')
    .select('doc_type, status, sections')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const type = getDocumentType(doc.doc_type as string);
  if (!type) return NextResponse.json({ error: 'Ukendt dokumenttype' }, { status: 400 });

  const check = incompleteSections(type, (doc.sections ?? {}) as DocumentSections);
  let update: Record<string, unknown>;

  if (action === 'submit') {
    if (doc.status !== 'kladde') {
      return NextResponse.json({ error: 'Dokumentet er allerede sendt' }, { status: 409 });
    }
    if (check.missing.length > 0) {
      return NextResponse.json(
        {
          error: 'Nogle afsnit mangler tekst',
          missing: check.missing,
          placeholders: check.placeholders,
        },
        { status: 422 }
      );
    }
    update = { status: 'til_godkendelse' };
  } else if (action === 'return') {
    if (doc.status !== 'til_godkendelse') {
      return NextResponse.json({ error: 'Dokumentet venter ikke på godkendelse' }, { status: 409 });
    }
    update = { status: 'kladde', review_note: optionalText(body.note, 2000) ?? null };
  } else {
    if (!ctx.permissions.includes(PERMISSIONS.APPROVE_JOURNAL)) {
      return NextResponse.json(
        { error: 'Du har ikke ret til at godkende dokumenter' },
        { status: 403 }
      );
    }
    if (doc.status !== 'kladde' && doc.status !== 'til_godkendelse') {
      return NextResponse.json({ error: 'Dokumentet er allerede godkendt' }, { status: 409 });
    }
    if (check.missing.length > 0 || check.placeholders.length > 0) {
      return NextResponse.json(
        {
          error: 'Dokumentet er ikke klar til godkendelse',
          missing: check.missing,
          placeholders: check.placeholders,
        },
        { status: 422 }
      );
    }
    update = { status: 'godkendt', review_note: null };
  }

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

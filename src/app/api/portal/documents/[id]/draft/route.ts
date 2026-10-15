import { NextRequest, NextResponse } from 'next/server';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { PERMISSIONS } from '@/lib/permissions';
import { extractCitations, sortSources } from '@/lib/documents/citations';
import { DRAFTERS } from '@/lib/documents/drafters';
import { getDocumentType, getSection } from '@/lib/documents/registry';
import type { DocumentMeta } from '@/lib/documents/types';
import { buildSectionUserMessage, cleanSectionText } from '@/lib/statusReport/prompt';
import { UUID_RE, readJson, requireStaff } from '../../_auth';
import { claudeApiKey } from '@/lib/ai/claudeTransport';

export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/portal/documents/[id]/draft
 * Body: { section } — skriver et AI-udkast til ét afsnit med kilder.
 * Gemmer ikke teksten; klienten indsætter den og gemmer selv, så personalet har sidste ord.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireStaff(PERMISSIONS.WRITE_JOURNAL);
  if ('error' in ctx) return ctx.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const limit = checkApiRateLimit('document-draft', ctx.user.id, 80, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'For mange udkast på kort tid. Prøv igen om lidt.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    );
  }

  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });

  const { data: doc, error: readErr } = await ctx.supabase
    .from('resident_documents')
    .select('resident_id, org_id, doc_type, status, meta')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!doc || doc.org_id !== ctx.orgId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (doc.status !== 'kladde' && doc.status !== 'til_godkendelse') {
    return NextResponse.json({ error: 'Dokumentet er godkendt og låst' }, { status: 409 });
  }
  const type = getDocumentType(doc.doc_type as string);
  const drafter = type ? DRAFTERS[type.key] : undefined;
  const section =
    type && typeof body.section === 'string' ? getSection(type, body.section) : undefined;
  if (!type || !drafter || !section || !section.aiDraft) {
    return NextResponse.json({ error: 'Ukendt afsnit' }, { status: 400 });
  }

  const apiKey = claudeApiKey();
  if (!apiKey) return NextResponse.json({ error: 'AI er ikke sat op' }, { status: 503 });

  const material = await drafter.collect({
    supabase: ctx.supabase,
    orgId: ctx.orgId,
    doc: { resident_id: doc.resident_id as string, meta: (doc.meta ?? {}) as DocumentMeta },
  });
  if (!material) {
    return NextResponse.json({
      text: '[Udfyldes af personalet: der er ingen data i BUDR for perioden]',
      sources: [],
      empty: true,
    });
  }

  const preferred = process.env.ANTHROPIC_STATUS_REPORT_MODEL?.trim();
  const ai = await callAnthropicJournalPolish({
    apiKey,
    system: drafter.system,
    userMessage: buildSectionUserMessage(section, material.text),
    maxTokens: 1200,
    preferredModels: preferred ? [preferred] : [],
  });
  if (!ai.ok) {
    console.error('[document-draft] AI-fejl', ai.status, ai.lastModel);
    return NextResponse.json({ error: 'AI-tjenesten svarede ikke. Prøv igen.' }, { status: 502 });
  }

  const cited = extractCitations(ai.text, material.refs);
  const text = cleanSectionText(cited.text, section.title);
  const sources = sortSources(cited.sources);

  await ctx.supabase.from('resident_document_events').insert({
    document_id: id,
    org_id: ctx.orgId,
    resident_id: doc.resident_id,
    action: 'ai_udkast',
    actor_id: ctx.user.id,
    detail: { section: section.key, sources: sources.length, model: ai.model },
  });

  return NextResponse.json({ text, sources });
}

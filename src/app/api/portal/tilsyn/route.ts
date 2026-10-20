import { NextResponse } from 'next/server';
import { requireStaff } from '@/app/api/portal/documents/_auth';
import { residentLabel } from '@/lib/assistant/names';
import { loadResidents } from '@/lib/assistant/server';
import { copenhagenYmd } from '@/lib/copenhagenDay';
import { getDocumentType } from '@/lib/documents/registry';
import { PERMISSIONS } from '@/lib/permissions';
import { buildTilsynSignals, tilsynHeadline } from '@/lib/tilsyn';

const DAY = 86400000;

/**
 * GET /api/portal/tilsyn — lederens «Er vi klar, hvis tilsynet kommer i morgen?».
 * Kun ledere (care_staff.role = 'leder'). Læser med lederens egen klient, så RLS gælder.
 */
export async function GET() {
  const ctx = await requireStaff(PERMISSIONS.VIEW_DASHBOARD);
  if ('error' in ctx) return ctx.error;
  const { supabase, orgId, user } = ctx;

  const { data: me } = await supabase
    .from('care_staff')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((me as { role?: string } | null)?.role !== 'leder') {
    return NextResponse.json({ error: 'Kun for ledere' }, { status: 403 });
  }

  const now = new Date();
  const today = copenhagenYmd(now);
  const iso = (days: number) => new Date(now.getTime() - days * DAY).toISOString();

  const [residents, draftsRes, docsRes, forceRes, notesRes, lysRes, approvedRes, transfersRes] =
    await Promise.all([
      loadResidents(supabase, orgId),
      supabase
        .from('journal_entries')
        .select('created_at')
        .eq('org_id', orgId)
        .eq('journal_status', 'kladde')
        .limit(1000),
      supabase
        .from('resident_documents')
        .select('id, resident_id, doc_type, title, status, due_date')
        .eq('org_id', orgId)
        .in('status', ['kladde', 'til_godkendelse'])
        .limit(500),
      supabase
        .from('resident_documents')
        .select('id, resident_id, status, created_at')
        .eq('org_id', orgId)
        .eq('doc_type', 'magtanvendelse')
        .neq('status', 'erstattet')
        .gte('created_at', iso(90))
        .limit(200),
      supabase
        .from('journal_entries')
        .select('resident_id, created_at')
        .eq('org_id', orgId)
        .neq('journal_status', 'resident_private')
        .gte('created_at', iso(30))
        .order('created_at', { ascending: false })
        .limit(5000),
      supabase
        .from('lys_checkin')
        .select('resident_id, created_at')
        .eq('org_id', orgId)
        .eq('traffic_light', 'rød')
        .gte('created_at', iso(7))
        .limit(1000),
      supabase
        .from('journal_entries')
        .select('id')
        .eq('org_id', orgId)
        .eq('journal_status', 'godkendt')
        .gte('created_at', iso(14))
        .limit(2000),
      supabase
        .from('journal_fagsystem_transfers')
        .select('journal_entry_id, transferred_at')
        .eq('org_id', orgId)
        .gte('transferred_at', iso(60))
        .limit(5000),
    ]);

  for (const [name, res] of Object.entries({
    drafts: draftsRes,
    docs: docsRes,
    force: forceRes,
    notes: notesRes,
    lys: lysRes,
    approved: approvedRes,
    transfers: transfersRes,
  })) {
    if (res.error) console.error(`[tilsyn] ${name}:`, res.error.message);
  }

  const nameOf = new Map(residents.map((r) => [r.user_id, residentLabel(r)]));
  const label = (id: string) => nameOf.get(id) ?? 'Borger';

  const lastNote = new Map<string, string>();
  for (const n of (notesRes.data ?? []) as { resident_id: string; created_at: string }[]) {
    if (!lastNote.has(n.resident_id)) lastNote.set(n.resident_id, n.created_at);
  }

  const redDays = new Map<string, Set<string>>();
  for (const c of (lysRes.data ?? []) as { resident_id: string; created_at: string }[]) {
    const days = redDays.get(c.resident_id) ?? new Set<string>();
    days.add(copenhagenYmd(new Date(c.created_at)));
    redDays.set(c.resident_id, days);
  }

  const transfers = (transfersRes.data ?? []) as { journal_entry_id: string }[];
  const transferred = new Set(transfers.map((t) => t.journal_entry_id));
  const approved = (approvedRes.data ?? []) as { id: string }[];
  const fagsystemInUse = transfers.length > 0;

  type DocRow = {
    id: string;
    resident_id: string;
    doc_type: string;
    title: string | null;
    status: string;
    due_date: string | null;
  };

  const signals = buildTilsynSignals({
    today,
    now,
    journalDrafts: ((draftsRes.data ?? []) as { created_at: string }[]).map((d) => ({
      createdAt: d.created_at,
    })),
    openDocuments: ((docsRes.data ?? []) as DocRow[]).map((d) => ({
      id: d.id,
      residentId: d.resident_id,
      residentName: label(d.resident_id),
      title: d.title?.trim() || getDocumentType(d.doc_type)?.title || 'Dokument',
      status: d.status,
      dueDate: d.due_date ? String(d.due_date).slice(0, 10) : null,
    })),
    forceReports: (
      (forceRes.data ?? []) as {
        id: string;
        resident_id: string;
        status: string;
        created_at: string;
      }[]
    ).map((f) => ({
      id: f.id,
      residentId: f.resident_id,
      residentName: label(f.resident_id),
      status: f.status,
      createdAt: f.created_at,
    })),
    residentsLastNote: residents.map((r) => ({
      residentId: r.user_id,
      name: residentLabel(r),
      lastNoteAt: lastNote.get(r.user_id) ?? null,
    })),
    lysRed: [...redDays.entries()].map(([id, days]) => ({
      residentId: id,
      name: label(id),
      redDays: days.size,
    })),
    untransferredNotes: fagsystemInUse
      ? approved.filter((a) => !transferred.has(a.id)).length
      : null,
  });

  return NextResponse.json({
    today,
    headline: tilsynHeadline(signals),
    signals,
  });
}

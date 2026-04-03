import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  let body: { proposalId?: string; staffId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const { proposalId, staffId } = body;
  if (!proposalId) {
    return NextResponse.json({ error: 'Mangler proposalId' }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 1. Fetch the pending proposal
  const { data: proposal, error: fetchErr } = await supabase
    .from('plan_proposals')
    .select('id, resident_id, plan_date, proposed_items')
    .eq('id', proposalId)
    .eq('status', 'pending')
    .single();

  if (fetchErr || !proposal) {
    return NextResponse.json(
      { error: 'Forslag ikke fundet eller allerede behandlet' },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();

  // 2. Upsert to daily_plans — this triggers Supabase Realtime for the Lys app
  const { data: updatedPlan, error: upsertErr } = await supabase
    .from('daily_plans')
    .upsert(
      {
        resident_id: proposal.resident_id as string,
        plan_date: proposal.plan_date as string,
        plan_items: proposal.proposed_items,
        created_by: staffId ?? null,
        updated_at: now,
      },
      { onConflict: 'resident_id,plan_date' }
    )
    .select()
    .single();

  if (upsertErr) {
    console.error('approve-proposal upsert error', upsertErr);
    return NextResponse.json({ error: 'Kunne ikke opdatere dagsplanen' }, { status: 500 });
  }

  // 3. Mark proposal as approved
  const { error: updateErr } = await supabase
    .from('plan_proposals')
    .update({
      status: 'approved',
      reviewed_by: staffId ?? null,
      reviewed_at: now,
    })
    .eq('id', proposalId);

  if (updateErr) {
    console.error('approve-proposal update error', updateErr);
    return NextResponse.json({ error: 'Kunne ikke opdatere forslagsstatus' }, { status: 500 });
  }

  return NextResponse.json({ success: true, updatedPlan });
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Godkender planforslag som **indlogget portal-personale** (Supabase JWT + RLS).
 * Bruger ikke service role — `care_staff_can_access_resident` håndhæves af databasen.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { proposalId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const proposalId = body.proposalId;
  if (!proposalId || typeof proposalId !== 'string') {
    return NextResponse.json({ error: 'Mangler proposalId' }, { status: 400 });
  }

  const { data: proposal, error: fetchErr } = await supabase
    .from('plan_proposals')
    .select('id, resident_id, plan_date, proposed_items')
    .eq('id', proposalId)
    .eq('status', 'pending')
    .maybeSingle();

  if (fetchErr) {
    console.error('approve-proposal fetch', fetchErr);
    return NextResponse.json({ error: 'Kunne ikke hente forslag' }, { status: 500 });
  }
  if (!proposal) {
    return NextResponse.json(
      { error: 'Forslag ikke fundet eller allerede behandlet' },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();
  const staffKey = user.id;

  const { data: updatedPlan, error: upsertErr } = await supabase
    .from('daily_plans')
    .upsert(
      {
        resident_id: proposal.resident_id as string,
        plan_date: proposal.plan_date as string,
        plan_items: proposal.proposed_items,
        created_by: staffKey,
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

  const { error: updateErr } = await supabase
    .from('plan_proposals')
    .update({
      status: 'approved',
      reviewed_by: staffKey,
      reviewed_at: now,
    })
    .eq('id', proposalId)
    .eq('status', 'pending');

  if (updateErr) {
    console.error('approve-proposal update error', updateErr);
    return NextResponse.json({ error: 'Kunne ikke opdatere forslagsstatus' }, { status: 500 });
  }

  return NextResponse.json({ success: true, updatedPlan });
}

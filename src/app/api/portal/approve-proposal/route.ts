import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { hasPortalPermission } from '@/lib/portalPermissions';

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
  if (!(await hasPortalPermission('edit_park_plans'))) {
    return NextResponse.json(
      { error: 'Du har ikke rettighed til at godkende planer' },
      { status: 403 }
    );
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

  const now = new Date().toISOString();
  const staffKey = user.id;

  // Gør forslaget til «approved» først, så et samtidigt afvis-kald ikke kan ende
  // med en aktiv plan fra et afvist forslag. Kun ét kald kan vinde claim'et.
  const { data: proposal, error: claimErr } = await supabase
    .from('plan_proposals')
    .update({ status: 'approved', reviewed_by: staffKey, reviewed_at: now })
    .eq('id', proposalId)
    .eq('status', 'pending')
    .select('id, resident_id, plan_date, proposed_items')
    .maybeSingle();

  if (claimErr) {
    console.error('approve-proposal claim', claimErr);
    return NextResponse.json({ error: 'Kunne ikke hente forslag' }, { status: 500 });
  }
  if (!proposal) {
    return NextResponse.json(
      { error: 'Forslag ikke fundet eller allerede behandlet' },
      { status: 404 }
    );
  }

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
    // Rul forslaget tilbage til «pending», så det kan behandles igen.
    await supabase
      .from('plan_proposals')
      .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
      .eq('id', proposalId)
      .eq('status', 'approved');
    return NextResponse.json({ error: 'Kunne ikke opdatere dagsplanen' }, { status: 500 });
  }

  return NextResponse.json({ success: true, updatedPlan });
}

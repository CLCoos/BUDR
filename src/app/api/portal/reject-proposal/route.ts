import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Afviser planforslag som **indlogget portal-personale** (Supabase JWT + RLS).
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

  const { data: existing, error: fetchErr } = await supabase
    .from('plan_proposals')
    .select('id')
    .eq('id', proposalId)
    .eq('status', 'pending')
    .maybeSingle();

  if (fetchErr) {
    console.error('reject-proposal fetch', fetchErr);
    return NextResponse.json({ error: 'Kunne ikke hente forslag' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json(
      { error: 'Forslag ikke fundet eller allerede behandlet' },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from('plan_proposals')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', proposalId)
    .eq('status', 'pending');

  if (error) {
    console.error('reject-proposal error', error);
    return NextResponse.json({ error: 'Kunne ikke afvise forslaget' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

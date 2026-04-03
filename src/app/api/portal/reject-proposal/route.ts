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

  const { error } = await supabase
    .from('plan_proposals')
    .update({
      status: 'rejected',
      reviewed_by: staffId ?? null,
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

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const residentUserId = req.nextUrl.searchParams.get('resident_user_id');
  if (!residentUserId) {
    return NextResponse.json({ error: 'missing_resident_id' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('resident_sessions')
    .select(
      'id, created_at, expires_at, last_used_at, revoked_at, revoked_by, revoke_reason, user_agent'
    )
    .eq('resident_user_id', residentUserId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId = body?.sessionId;
  const reason = typeof body?.reason === 'string' ? body.reason : 'staff_revoke';

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'missing_session_id' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('resident_sessions')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
      revoke_reason: reason,
    })
    .eq('id', sessionId)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: Boolean(data) });
}

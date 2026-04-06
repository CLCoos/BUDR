import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logStaffLoginAudit } from '@/lib/staffAuditLog';
import { parseStaffOrgId } from '@/lib/staffOrgScope';

/**
 * Called from the browser right after successful sign-in so the session cookies
 * are included in the request. Server Actions that redirect often fail to persist
 * Supabase auth cookies in Next.js.
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'no_supabase' }, { status: 503 });
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const h = await headers();
  const clientIp = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
  const orgId = parseStaffOrgId(user.user_metadata?.org_id);

  await logStaffLoginAudit({
    staffUserId: user.id,
    orgId,
    clientIp,
  });

  return NextResponse.json({ ok: true });
}

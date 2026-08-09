import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { parseStaffOrgId } from '@/lib/staffOrgScope';

/** Portal UI may only emit these actions via the browser helper. */
const ALLOWED_ACTIONS = new Set([
  'journal.entry_created',
  'daily_plan.created',
  'daily_plan.updated',
]);

type AuditBody = {
  action?: unknown;
  tableName?: unknown;
  recordId?: unknown;
  metadata?: unknown;
};

/**
 * Best-effort staff audit write. Actor identity comes from the session —
 * clients cannot spoof actor_id / actor_org_id / action outside the allowlist.
 * Uses service role because create_audit_log EXECUTE is revoked from authenticated.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: staffRow } = await supabase
    .from('care_staff')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!staffRow) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: AuditBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action : '';
  const tableName = typeof body.tableName === 'string' ? body.tableName : '';
  if (!ALLOWED_ACTIONS.has(action) || !tableName) {
    return NextResponse.json({ error: 'Ugyldig audit-payload' }, { status: 400 });
  }

  const recordId =
    typeof body.recordId === 'string' && body.recordId.length > 0 ? body.recordId : null;
  const metadata =
    body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? body.metadata
      : null;

  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin.rpc('create_audit_log', {
      p_actor_type: 'care_staff',
      p_action: action,
      p_actor_id: user.id,
      p_actor_org_id: parseStaffOrgId(staffRow.org_id),
      p_target_table: tableName,
      p_target_id: recordId ?? undefined,
      p_metadata: metadata ?? undefined,
    });
    if (error) {
      console.error('portal audit-log', error.message);
      return NextResponse.json({ error: 'Audit fejlede' }, { status: 500 });
    }
  } catch (e) {
    console.error('portal audit-log', e);
    return NextResponse.json({ error: 'Audit utilgængelig' }, { status: 503 });
  }

  return NextResponse.json({ success: true });
}

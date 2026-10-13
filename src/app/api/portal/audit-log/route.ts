import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { isValidUuid } from '@/lib/uuid';

const ALLOWED_ACTIONS = new Set([
  'journal.entry_created',
  'daily_plan.created',
  'daily_plan.updated',
]);

/**
 * POST /api/portal/audit-log
 * Portal-handlinger logges herfra i stedet for via klient-RPC, så aktør og organisation
 * altid kommer fra den indloggede medarbejders session og ikke kan forfalskes.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const tableName = body?.tableName;
  const recordId = body?.recordId;
  const metadata = body?.metadata;

  if (typeof action !== 'string' || !ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  }
  if (typeof tableName !== 'string' || !/^[a-z_]{1,64}$/.test(tableName)) {
    return NextResponse.json({ error: 'invalid_table' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: staff } = await supabase
    .from('care_staff')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!staff?.org_id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let admin;
  try {
    admin = createAdminSupabaseClient();
  } catch {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { error } = await admin.rpc('create_audit_log', {
    p_actor_type: 'care_staff',
    p_action: action,
    p_actor_id: user.id,
    p_actor_org_id: staff.org_id,
    p_target_table: tableName,
    p_target_id: typeof recordId === 'string' && isValidUuid(recordId) ? recordId : null,
    p_metadata:
      metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : null,
  });
  if (error) return NextResponse.json({ error: 'audit_failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}

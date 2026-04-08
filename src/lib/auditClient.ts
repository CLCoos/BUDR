'use client';

import { createClient } from '@/lib/supabase/client';
import { parseStaffOrgId } from '@/lib/staffOrgScope';

type AuditPayload = {
  action: string;
  tableName: string;
  recordId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logPortalAudit(payload: AuditPayload): Promise<void> {
  try {
    const supabase = createClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = parseStaffOrgId(user.user_metadata?.org_id);
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'care_staff',
      p_action: payload.action,
      p_actor_id: user.id,
      p_actor_org_id: orgId,
      p_target_table: payload.tableName,
      p_target_id: payload.recordId ?? undefined,
      p_metadata: payload.metadata ?? undefined,
    });
  } catch {
    // best-effort
  }
}

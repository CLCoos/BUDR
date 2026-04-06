import { createClient } from '@supabase/supabase-js';

/**
 * Best-effort audit entry for staff login (service role).
 * Requires SUPABASE_SERVICE_ROLE_KEY in the server environment.
 */
export async function logStaffLoginAudit(params: {
  staffUserId: string;
  orgId: string | null;
  clientIp: string | null;
}): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  const admin = createClient(url, serviceKey);
  try {
    const { error } = await admin.rpc('create_audit_log', {
      p_actor_type: 'care_staff',
      p_action: 'staff.login',
      p_actor_id: params.staffUserId,
      p_actor_org_id: params.orgId,
      p_ip_address: params.clientIp ?? undefined,
    });
    if (error) {
      /* best-effort audit */
    }
  } catch {
    /* ignore */
  }
}

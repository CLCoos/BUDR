'use client';

type AuditPayload = {
  action: string;
  tableName: string;
  recordId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Best-effort portal audit. Posts to a Route Handler that writes via service role
 * (create_audit_log is not callable from the browser JWT).
 */
export async function logPortalAudit(payload: AuditPayload): Promise<void> {
  try {
    await fetch('/api/portal/audit-log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        action: payload.action,
        tableName: payload.tableName,
        recordId: payload.recordId ?? null,
        metadata: payload.metadata ?? null,
      }),
    });
  } catch {
    // best-effort
  }
}

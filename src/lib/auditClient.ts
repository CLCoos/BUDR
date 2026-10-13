'use client';

type AuditPayload = {
  action: string;
  tableName: string;
  recordId?: string | null;
  metadata?: Record<string, unknown>;
};

/** Best-effort revisionsspor for portalhandlinger; aktør og org afgøres på serveren. */
export async function logPortalAudit(payload: AuditPayload): Promise<void> {
  try {
    await fetch('/api/portal/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort
  }
}

export type MarketingCmsRevision = {
  id: string;
  created_at: string;
  actor_id: string | null;
  action: 'draft_save' | 'publish' | 'rollback';
  snapshot: unknown;
};

const MAX_REVISIONS = 20;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function sanitizeRevisions(input: unknown): MarketingCmsRevision[] {
  if (!Array.isArray(input)) return [];
  const out: MarketingCmsRevision[] = [];
  for (const row of input) {
    if (!isRecord(row)) continue;
    const id = typeof row.id === 'string' ? row.id : '';
    const createdAt = typeof row.created_at === 'string' ? row.created_at : '';
    const action = row.action;
    if (!id || !createdAt) continue;
    if (action !== 'draft_save' && action !== 'publish' && action !== 'rollback') continue;
    out.push({
      id,
      created_at: createdAt,
      actor_id: typeof row.actor_id === 'string' ? row.actor_id : null,
      action,
      snapshot: row.snapshot,
    });
  }
  return out.slice(0, MAX_REVISIONS);
}

export function appendRevision(
  existing: MarketingCmsRevision[],
  next: Omit<MarketingCmsRevision, 'id' | 'created_at'> & { id?: string; created_at?: string }
): MarketingCmsRevision[] {
  const revision: MarketingCmsRevision = {
    id: next.id ?? crypto.randomUUID(),
    created_at: next.created_at ?? new Date().toISOString(),
    actor_id: next.actor_id ?? null,
    action: next.action,
    snapshot: next.snapshot,
  };
  return [revision, ...existing].slice(0, MAX_REVISIONS);
}

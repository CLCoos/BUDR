/** Standard UUID (alle versioner) — samme som tidligere middleware/session UUID_RE. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function safeRandomUUID(): string {
  if (typeof globalThis !== 'undefined') {
    const maybeCrypto = (globalThis as { crypto?: Crypto }).crypto;
    if (maybeCrypto?.randomUUID) return maybeCrypto.randomUUID();
  }
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `id-${now}-${rand}`;
}

/** Kanonisk UUID-validator for resident-id, session, conversation_id, osv. */
export function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return UUID_RE.test(value.trim());
}

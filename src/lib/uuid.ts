export function safeRandomUUID(): string {
  if (typeof globalThis !== 'undefined') {
    const maybeCrypto = (globalThis as { crypto?: Crypto }).crypto;
    if (maybeCrypto?.randomUUID) return maybeCrypto.randomUUID();
  }
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `id-${now}-${rand}`;
}

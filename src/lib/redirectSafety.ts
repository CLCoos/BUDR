export function sanitizeNext(next: string | null | undefined): string {
  const fallback = '/park-hub';
  if (!next || !next.startsWith('/') || next.includes('//') || next.includes(':')) {
    return fallback;
  }
  return next;
}

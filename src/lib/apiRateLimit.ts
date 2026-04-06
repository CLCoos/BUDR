import type { NextRequest } from 'next/server';

/** Per-isolate sliding window (serverless: resets ved cold start). */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * @param namespace unikt pr. route (fx lys-chat)
 * @param limit max antal kald pr. vindue
 * @param windowMs vindueslængde i ms
 */
export function checkApiRateLimit(
  namespace: string,
  ip: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const key = `${namespace}:${ip}`;
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }

  entry.count += 1;
  return { ok: true };
}

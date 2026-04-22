import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.BUDR_ADMIN_SECRET ?? '';
  if (!secret) return false;

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';
  return token.length > 0 && token === secret;
}

/**
 * POST /api/internal/sentry-smoke
 * Sends a controlled test exception to Sentry.
 * Requires Authorization: Bearer <BUDR_ADMIN_SECRET>.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const error = new Error('Sentry smoke test from /api/internal/sentry-smoke');
  Sentry.captureException(error, {
    tags: { area: 'ops', kind: 'smoke-test' },
    level: 'error',
  });
  await Sentry.flush(2000);

  return NextResponse.json({
    ok: true,
    message: 'Smoke test event sent to Sentry',
  });
}

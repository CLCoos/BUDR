import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'budr_resident_session';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Validate a resident session token against the resident-session-validate edge function.
 * Returns resident_id on success, null on failure.
 */
async function validateSession(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/resident-session-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: token }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { resident_id: string }; error?: string };
    return json.data?.resident_id ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /park/* routes
  if (!pathname.startsWith('/park')) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // No session cookie — redirect to login
    // Extract resident_id from URL if present (/park/[resident_id]/...)
    // Fallback: redirect to generic login
    const residentIdMatch = pathname.match(/^\/park\/([^/]+)/);
    const residentId = residentIdMatch?.[1] ?? 'unknown';
    const loginUrl = new URL(`/login/${residentId}`, req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const residentId = await validateSession(token);

  if (!residentId) {
    // Invalid/expired session — clear cookie and redirect to login
    const response = NextResponse.redirect(new URL('/login/unknown', req.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Valid session — inject resident_id header and continue
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-resident-id', residentId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/park/:path*'],
};

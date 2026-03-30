import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const RESIDENT_COOKIE = 'budr_resident_session';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Route matchers ────────────────────────────────────────────

function isCarePortalRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/care-portal-dashboard') ||
    pathname.startsWith('/handover-workspace') ||
    pathname.startsWith('/resident-360-view')
  );
}

function isResidentRoute(pathname: string): boolean {
  return pathname.startsWith('/park-hub') || pathname.startsWith('/park/');
}

// ── Staff auth (Supabase Auth JWT) ────────────────────────────

async function checkStaffAuth(
  req: NextRequest,
): Promise<{ response: NextResponse; authenticated: boolean }> {
  let supabaseResponse = NextResponse.next({ request: req });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() validates the JWT server-side — never trust getSession() alone
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response: supabaseResponse, authenticated: !!user };
}

// ── Resident auth (custom HttpOnly cookie) ────────────────────

async function validateResidentSession(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/resident-session-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: token }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { data?: { resident_id: string } };
    return !!json.data?.resident_id;
  } catch {
    return false;
  }
}

// ── Middleware ────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isCarePortalRoute(pathname)) {
    const { response, authenticated } = await checkStaffAuth(req);
    if (!authenticated) {
      return NextResponse.redirect(new URL('/care-portal-login', req.url));
    }
    return response;
  }

  if (isResidentRoute(pathname)) {
    const token = req.cookies.get(RESIDENT_COOKIE)?.value;
    if (!token) {
      const loginUrl = new URL('/login/unknown', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const valid = await validateResidentSession(token);
    if (!valid) {
      const response = NextResponse.redirect(new URL('/login/unknown', req.url));
      response.cookies.delete(RESIDENT_COOKIE);
      return response;
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/care-portal-dashboard',
    '/care-portal-dashboard/:path*',
    '/handover-workspace',
    '/handover-workspace/:path*',
    '/resident-360-view',
    '/resident-360-view/:path*',
    '/park-hub',
    '/park-hub/:path*',
    '/park/:path*',
  ],
};

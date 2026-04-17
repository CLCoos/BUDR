import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const RESIDENT_COOKIE = 'budr_resident_id';
const DEMO_RESIDENT_ID = 'demo-resident-001';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** I production: ingen auto-demo-cookie. Sæt til `true` på staging/preview hvis I bevidst vil beholde demo-fallback. */
function allowParkDemoCookie(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.BUDR_ALLOW_PARK_DEMO_COOKIE === 'true';
}

// ── Route matchers ────────────────────────────────────────────

function isCarePortalRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/care-portal-dashboard') ||
    pathname.startsWith('/care-portal-indsatsdok') ||
    pathname.startsWith('/care-portal-tilsynsrapport') ||
    pathname.startsWith('/care-portal-settings') ||
    pathname.startsWith('/care-portal-import') ||
    pathname.startsWith('/care-portal-assistant') ||
    pathname.startsWith('/care-portal-vagtplan') ||
    pathname.startsWith('/care-portal-beskeder') ||
    pathname.startsWith('/care-portal-residents') ||
    pathname.startsWith('/care-portal-resident-preview') ||
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
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { response: NextResponse.next({ request: req }), authenticated: false };
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response: supabaseResponse, authenticated: false };
  }

  // Verify the user exists in care_staff (source of truth for staff authorisation).
  const { data: isStaff } = await supabase.rpc('care_is_portal_staff');

  return { response: supabaseResponse, authenticated: !!isStaff };
}

// ── Middleware ────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Redirect already-authenticated staff away from the login page.
  if (pathname === '/care-portal-login') {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const { authenticated } = await checkStaffAuth(req);
      if (authenticated) {
        return NextResponse.redirect(new URL('/care-portal-dashboard', req.url));
      }
    }
    return NextResponse.next();
  }

  if (isCarePortalRoute(pathname)) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.redirect(new URL('/care-portal-login?err=config', req.url));
    }
    const { response, authenticated } = await checkStaffAuth(req);
    if (!authenticated) {
      return NextResponse.redirect(new URL('/care-portal-login', req.url));
    }
    return response;
  }

  if (isResidentRoute(pathname)) {
    const residentId = req.cookies.get(RESIDENT_COOKIE)?.value;
    if (!residentId) {
      if (!allowParkDemoCookie()) {
        const home = new URL('/', req.url);
        home.searchParams.set('park', 'login');
        return NextResponse.redirect(home);
      }
      req.cookies.set(RESIDENT_COOKIE, DEMO_RESIDENT_ID);
      const response = NextResponse.next({ request: req });
      response.cookies.set(RESIDENT_COOKIE, DEMO_RESIDENT_ID, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
      return response;
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/care-portal-login',
    '/care-portal-dashboard',
    '/care-portal-dashboard/:path*',
    '/care-portal-indsatsdok',
    '/care-portal-indsatsdok/:path*',
    '/care-portal-tilsynsrapport',
    '/care-portal-tilsynsrapport/:path*',
    '/care-portal-settings',
    '/care-portal-settings/:path*',
    '/care-portal-import',
    '/care-portal-import/:path*',
    '/care-portal-assistant',
    '/care-portal-assistant/:path*',
    '/care-portal-vagtplan',
    '/care-portal-vagtplan/:path*',
    '/care-portal-beskeder',
    '/care-portal-beskeder/:path*',
    '/care-portal-residents',
    '/care-portal-residents/:path*',
    '/care-portal-resident-preview',
    '/care-portal-resident-preview/:path*',
    '/handover-workspace',
    '/handover-workspace/:path*',
    '/resident-360-view',
    '/resident-360-view/:path*',
    '/park-hub',
    '/park-hub/:path*',
    '/park/:path*',
  ],
};

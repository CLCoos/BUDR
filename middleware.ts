import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const RESIDENT_ID_COOKIE = 'budr_resident_id';
const RESIDENT_SESSION_COOKIE = 'budr_resident_session';
const DEMO_RESIDENT_ID = 'demo-resident-001';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/** Tillader alle standard UUID-former (fx fra gen_random_uuid / crypto.randomUUID). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mislykkede park-/beboer-valideringer pr. IP (kun in-memory; single-instance). */
const PARK_FAIL_TIMESTAMPS = new Map<string, number[]>();
const PARK_FAIL_WINDOW_MS = 60_000;
const PARK_FAIL_MAX = 10;

function carePortalSimulated(): boolean {
  return process.env.NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA === 'true';
}

/** I production: ingen auto-demo-cookie. Sæt til `true` på staging/preview hvis I bevidst vil beholde demo-fallback. */
function allowParkDemoCookie(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.BUDR_ALLOW_PARK_DEMO_COOKIE === 'true';
}

function clientIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Returnerer true hvis IP skal soft-blokeres (for mange fejl). */
function registerParkValidationFailure(ip: string): boolean {
  const now = Date.now();
  const prev = PARK_FAIL_TIMESTAMPS.get(ip) ?? [];
  const recent = prev.filter((t) => now - t < PARK_FAIL_WINDOW_MS);
  recent.push(now);
  PARK_FAIL_TIMESTAMPS.set(ip, recent);
  return recent.length > PARK_FAIL_MAX;
}

function isCarePortalDemoRoute(pathname: string): boolean {
  return pathname === '/care-portal-demo' || pathname.startsWith('/care-portal-demo/');
}

/**
 * Live Care Portal + tilknyttede staff-ruter (ikke login, ikke demo).
 * Alle paths under `/care-portal-` undtagen login og demo, plus handover og 360°.
 */
function isCarePortalStaffRoute(pathname: string): boolean {
  if (pathname === '/care-portal-login') return false;
  if (isCarePortalDemoRoute(pathname)) return false;
  if (pathname.startsWith('/care-portal-')) return true;
  return pathname.startsWith('/handover-workspace') || pathname.startsWith('/resident-360-view');
}

function isResidentRoute(pathname: string): boolean {
  return pathname.startsWith('/park-hub') || pathname.startsWith('/park/');
}

function isBudrAdminRoute(pathname: string): boolean {
  return pathname === '/budr-admin' || pathname.startsWith('/budr-admin/');
}

function unauthorizedBasicAuthResponse(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="BUDR Admin", charset="UTF-8"',
    },
  });
}

function isValidBudrAdminBasicAuth(req: NextRequest): boolean {
  const adminSecret = process.env.BUDR_ADMIN_SECRET ?? '';
  if (!adminSecret) return false;

  const expectedUser = process.env.BUDR_ADMIN_BASIC_USER ?? 'budr';
  const expectedPass = process.env.BUDR_ADMIN_BASIC_PASS ?? adminSecret;
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Basic ')) return false;

  try {
    const decoded = atob(authHeader.slice(6));
    const idx = decoded.indexOf(':');
    if (idx < 0) return false;
    const username = decoded.slice(0, idx);
    const password = decoded.slice(idx + 1);
    return username === expectedUser && password === expectedPass;
  } catch {
    return false;
  }
}

function clearResidentCookies(res: NextResponse): void {
  const clear = (name: string) => {
    res.cookies.set(name, '', { maxAge: 0, path: '/' });
  };
  clear(RESIDENT_ID_COOKIE);
  clear(RESIDENT_SESSION_COOKIE);
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function getServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function residentExistsInDb(userId: string): Promise<boolean | null> {
  const admin = getServiceClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from('care_residents')
    .select('user_id, org_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  if (!data) return false;
  const orgId = (data as { org_id?: string | null }).org_id ?? null;
  if (!orgId) return true;
  const { data: orgRow, error: orgErr } = await admin
    .from('organisations')
    .select('deactivated_at')
    .eq('id', orgId)
    .maybeSingle();
  if (orgErr) return null;
  return !orgRow?.deactivated_at;
}

// ── Staff auth (Supabase Auth JWT + care_staff) ───────────────

type StaffAuthResult =
  | { kind: 'ok'; response: NextResponse; permissions: string[] }
  | { kind: 'deactivated'; response: NextResponse }
  | { kind: 'incomplete'; response: NextResponse }
  | { kind: 'no_session'; response: NextResponse }
  | { kind: 'no_staff_row'; response: NextResponse }
  | { kind: 'misconfigured'; response: NextResponse };

async function checkStaffAuth(req: NextRequest): Promise<StaffAuthResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      kind: 'misconfigured',
      response: NextResponse.next({ request: req }),
    };
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
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { kind: 'no_session', response: supabaseResponse };
  }

  const orgIdFromMetadata =
    typeof user.user_metadata?.org_id === 'string' ? user.user_metadata.org_id : null;
  if (!orgIdFromMetadata) {
    return { kind: 'incomplete', response: supabaseResponse };
  }

  const { data: orgFromMetadata } = await supabase
    .from('organisations')
    .select('id,deactivated_at')
    .eq('id', orgIdFromMetadata)
    .maybeSingle();
  if (!orgFromMetadata || orgFromMetadata.deactivated_at) {
    return { kind: 'incomplete', response: supabaseResponse };
  }

  const { data: staffRow, error } = await supabase
    .from('care_staff')
    .select('id, role, role_id, org_id')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !staffRow) {
    return { kind: 'incomplete', response: supabaseResponse };
  }
  if (staffRow.org_id !== orgIdFromMetadata) {
    return { kind: 'incomplete', response: supabaseResponse };
  }

  if (staffRow.org_id) {
    const { data: orgRow } = await supabase
      .from('organisations')
      .select('deactivated_at')
      .eq('id', staffRow.org_id)
      .maybeSingle();
    if (orgRow?.deactivated_at) {
      return { kind: 'deactivated', response: supabaseResponse };
    }
  }

  let permissions: string[] = [];
  if (staffRow?.role_id) {
    const { data: roleRow } = await supabase
      .from('org_roles')
      .select('permissions')
      .eq('id', staffRow.role_id)
      .maybeSingle();
    permissions = Array.isArray(roleRow?.permissions)
      ? roleRow.permissions.filter((p): p is string => typeof p === 'string')
      : [];
  }

  if (permissions.length === 0 && staffRow?.role === 'leder') {
    permissions = ['*'];
  }

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-staff-permissions', JSON.stringify(permissions));
  const responseWithHeader = NextResponse.next({
    request: { headers: reqHeaders },
  });
  supabaseResponse.cookies.getAll().forEach((c) => {
    responseWithHeader.cookies.set(c.name, c.value, c);
  });

  return { kind: 'ok', response: responseWithHeader, permissions };
}

// ── Middleware ────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 0) Intern BUDR admin-side: HTTP Basic Auth ovenpå side-secret.
  if (isBudrAdminRoute(pathname)) {
    if (!isValidBudrAdminBasicAuth(req)) {
      return unauthorizedBasicAuthResponse();
    }
    return NextResponse.next();
  }

  // 1) Demo-portal: kun synlig når simulerings-flag er sat
  if (isCarePortalDemoRoute(pathname) && !carePortalSimulated()) {
    return new NextResponse(null, { status: 404 });
  }

  // 2) Staff login-side: altid åben; redirect hvis allerede autoriseret
  if (pathname === '/care-portal-login') {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const auth = await checkStaffAuth(req);
      if (auth.kind === 'ok') {
        return NextResponse.redirect(new URL('/care-portal-dashboard', req.url));
      }
      if (auth.kind === 'deactivated') {
        const current = req.nextUrl.searchParams.get('error');
        if (current !== 'deactivated') {
          return NextResponse.redirect(new URL('/care-portal-login?error=deactivated', req.url));
        }
      }
    }
    return NextResponse.next();
  }

  // 3) Øvrig live Care Portal + handover + 360°
  if (isCarePortalStaffRoute(pathname)) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.redirect(new URL('/care-portal-login?err=config', req.url));
    }
    const auth = await checkStaffAuth(req);
    if (auth.kind === 'no_session' || auth.kind === 'misconfigured') {
      return NextResponse.redirect(new URL('/care-portal-login', req.url));
    }
    if (auth.kind === 'deactivated') {
      return NextResponse.redirect(new URL('/care-portal-login?error=deactivated', req.url));
    }
    if (auth.kind === 'incomplete' && pathname !== '/care-portal-dashboard/setup') {
      return NextResponse.redirect(new URL('/care-portal-dashboard/setup', req.url));
    }
    if (auth.kind === 'no_staff_row') {
      return NextResponse.redirect(new URL('/care-portal-login?error=unauthorized', req.url));
    }
    return auth.response;
  }

  // 4) Beboer-ruter (Lys / park)
  if (isResidentRoute(pathname)) {
    const ip = clientIp(req);
    const residentId = req.cookies.get(RESIDENT_ID_COOKIE)?.value?.trim();

    const redirectHomeClear = (rateLimited: boolean) => {
      const home = new URL('/', req.url);
      if (rateLimited) {
        home.searchParams.set('park', 'ratelimit');
      } else {
        home.searchParams.set('park', 'login');
      }
      const res = NextResponse.redirect(home);
      clearResidentCookies(res);
      return res;
    };

    const failAndMaybeBlock = (): NextResponse => {
      const blocked = registerParkValidationFailure(ip);
      return redirectHomeClear(blocked);
    };

    if (!residentId) {
      if (!allowParkDemoCookie()) {
        return redirectHomeClear(false);
      }
      const res = NextResponse.next({ request: req });
      res.cookies.set(RESIDENT_ID_COOKIE, DEMO_RESIDENT_ID, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
      return res;
    }

    if (residentId === DEMO_RESIDENT_ID) {
      if (allowParkDemoCookie()) {
        return NextResponse.next();
      }
      return failAndMaybeBlock();
    }

    if (!isUuid(residentId)) {
      return failAndMaybeBlock();
    }

    const exists = await residentExistsInDb(residentId);
    if (exists === null) {
      return failAndMaybeBlock();
    }
    if (!exists) {
      return failAndMaybeBlock();
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/budr-admin',
    '/budr-admin/:path*',
    '/care-portal-login',
    '/care-portal-demo',
    '/care-portal-demo/:path*',
    '/care-portal-dashboard',
    '/care-portal-dashboard/:path*',
    '/care-portal-indsatsdok',
    '/care-portal-indsatsdok/:path*',
    '/care-portal-tilsynsrapport',
    '/care-portal-tilsynsrapport/:path*',
    '/care-portal-settings',
    '/care-portal-settings/:path*',
    '/care-portal-roles',
    '/care-portal-roles/:path*',
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
    '/care-portal-journal',
    '/care-portal-journal/:path*',
    '/care-portal-planner',
    '/care-portal-planner/:path*',
    '/care-portal-alerts',
    '/care-portal-alerts/:path*',
    '/handover-workspace',
    '/handover-workspace/:path*',
    '/resident-360-view',
    '/resident-360-view/:path*',
    '/park-hub',
    '/park-hub/:path*',
    '/park/:path*',
  ],
};

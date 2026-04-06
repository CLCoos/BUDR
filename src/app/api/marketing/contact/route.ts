import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkApiRateLimit, getClientIp } from '@/lib/apiRateLimit';

const MAX = {
  name: 160,
  institution: 240,
  role: 160,
  message: 8000,
  source: 64,
} as const;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function trimStr(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limited = checkApiRateLimit('marketing-contact', ip, 10, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'For mange forsøg. Prøvable senere.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørgsel' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Manglende data' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (typeof b.website === 'string' && b.website.trim() !== '') {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const name = trimStr(b.name, MAX.name);
  const institution = trimStr(b.institution, MAX.institution);
  const role = trimStr(b.role, MAX.role);
  const message = trimStr(b.message, MAX.message);
  const source = trimStr(b.source, MAX.source) ?? 'marketing';

  if (!name || !institution || !role || !message) {
    return NextResponse.json({ error: 'Udfyld alle felter' }, { status: 422 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Kontaktformularen er midlertidigt utilgængelig. Skriv til hej@budrcare.dk.' },
      { status: 503 }
    );
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 512) ?? null;
  const referrer = typeof b.referrer === 'string' ? b.referrer.trim().slice(0, 2048) || null : null;

  const { error } = await supabase.from('marketing_contact_submissions').insert({
    name,
    institution,
    role,
    message,
    source,
    referrer,
    user_agent: userAgent,
    client_ip: ip === 'unknown' ? null : ip.slice(0, 64),
  });

  if (error) {
    console.error('[marketing/contact]', error.message);
    return NextResponse.json(
      { error: 'Kunne ikke gemme henvendelsen. Prøv igen senere.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

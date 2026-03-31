import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Prevents token enumeration: an attacker probing random UUIDs to find valid
// sessions would be cut off at 10 requests per IP per 60-second window.
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT     = 10;
const RATE_WINDOW_MS = 60_000;

function getClientIp(req: Request): string {
  // Supabase edge runtime forwards the real client IP in x-forwarded-for.
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT) return true;

  entry.count++;
  return false;
}

// ── UUID format guard ─────────────────────────────────────────────────────────
// Session tokens are random UUIDs. Reject anything that doesn't match the
// format before touching the database — cuts out probing with arbitrary strings.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── 1. Rate limit ──────────────────────────────────────────────────────────
  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'too_many_requests' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── 2. Input validation ────────────────────────────────────────────────────
  // Validate type, presence, and UUID format before any DB call.
  let sessionToken: string;

  try {
    const body = await req.json() as Record<string, unknown>;

    if (typeof body.session_token !== 'string' || !body.session_token) {
      return new Response(
        JSON.stringify({ error: 'invalid_input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Reject non-UUID strings immediately — avoids a DB round-trip and prevents
    // probing with arbitrary byte sequences.
    if (!UUID_RE.test(body.session_token)) {
      return new Response(
        JSON.stringify({ error: 'invalid_input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    sessionToken = body.session_token;
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_input' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // ── 3. Session lookup ──────────────────────────────────────────────────
    // Token comparison is an indexed equality lookup on a random UUID.
    // Timing differences reflect DB I/O, not secret state — there is no
    // partial-match path, so this is not vulnerable to timing attacks.
    const { data: session, error } = await supabase
      .from('resident_sessions')
      .select('resident_id, expires_at')
      .eq('token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      // ── Audit: failed validation (best-effort) ─────────────────────────
      // Log failures only — successful validations fire on every page load
      // and would generate excessive noise in the audit trail.
      await supabase.rpc('create_audit_log', {
        p_actor_type: 'resident',
        p_action:     'resident.login_failed',
        p_metadata:   { reason: 'invalid_session' },
        p_ip_address: clientIp,
      }).catch(() => { /* audit failure must not affect auth response */ });

      return new Response(
        JSON.stringify({ error: 'Session ugyldig eller udløbet' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ data: { resident_id: session.resident_id } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Intern fejl' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

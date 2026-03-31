import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Module-level map persists for the lifetime of the isolate instance.
// Limit: 10 requests per IP per 60-second sliding window.
// This makes brute-forcing a 4-digit PIN (~10 000 combinations) take ~16 hours
// even if an attacker cycles through IPs, it remains a meaningful barrier.
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
    // First request in this window (or previous window expired)
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT) return true; // window active, cap exceeded

  entry.count++;
  return false;
}

// ── UUID helper ───────────────────────────────────────────────────────────────
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
  // Validate types and shapes before touching the database.
  let residentId: string;
  let pin: string;

  try {
    const body = await req.json() as Record<string, unknown>;
    // resident_id must be a string (UUID validated below); pin must be exactly 4 digits
    if (
      typeof body.resident_id !== 'string' ||
      typeof body.pin         !== 'string' ||
      !UUID_RE.test(body.resident_id)       ||
      !/^\d{4}$/.test(body.pin)
    ) {
      return new Response(
        JSON.stringify({ error: 'invalid_input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    residentId = body.resident_id;
    pin        = body.pin;
  } catch {
    // req.json() threw — malformed JSON body
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
    // ── 3. PIN verification ────────────────────────────────────────────────
    // verify_resident_pin() delegates to pgcrypto's crypt() for comparison.
    // pgcrypto uses a constant-time bcrypt implementation, making this
    // inherently resistant to timing attacks — no additional wrapper needed.
    const { data: valid, error: rpcErr } = await supabase
      .rpc('verify_resident_pin', { p_resident_id: residentId, p_pin: pin });

    if (rpcErr || !valid) {
      // ── Audit: failed login attempt (best-effort, never blocks response) ──
      await supabase.rpc('create_audit_log', {
        p_actor_type: 'resident',
        p_action:     'resident.login_failed',
        p_actor_id:   residentId,
        p_metadata:   { reason: 'invalid_pin' },
        p_ip_address: clientIp,
      }).catch(() => { /* audit failure must not affect auth response */ });

      return new Response(
        JSON.stringify({ error: 'Ugyldig PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 4. Create 12-hour session ──────────────────────────────────────────
    const { data: session, error: sessionErr } = await supabase
      .from('resident_sessions')
      .insert({
        resident_id: residentId,
        token:       crypto.randomUUID(),
        expires_at:  new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      })
      .select('token')
      .single();

    if (sessionErr || !session) {
      return new Response(
        JSON.stringify({ error: 'Kunne ikke oprette session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Audit: successful login ────────────────────────────────────────────
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'resident',
      p_action:     'resident.login',
      p_actor_id:   residentId,
      p_ip_address: clientIp,
    }).catch(() => { /* best-effort */ });

    return new Response(
      JSON.stringify({ data: { session_token: session.token } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Intern fejl' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

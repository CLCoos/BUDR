import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function randomSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

async function createResidentSession(
  supabase: ReturnType<typeof createClient>,
  residentId: string,
  req: Request
): Promise<string | null> {
  const { data: resident, error: residentErr } = await supabase
    .from('care_residents')
    .select('org_id')
    .eq('user_id', residentId)
    .maybeSingle();

  if (residentErr || !resident?.org_id) return null;

  const token = randomSessionToken();
  const clientIp = getClientIp(req);
  const ipHash =
    clientIp && clientIp !== 'unknown' ? (await sha256Hex(clientIp)).slice(0, 16) : null;

  const { error } = await supabase.from('resident_sessions').insert({
    resident_user_id: residentId,
    org_id: resident.org_id,
    session_token_hash: await sha256Hex(token),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    user_agent: req.headers.get('user-agent'),
    ip_hash: ipHash,
  });

  if (error) return null;
  return token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { resident_id, credential_id, counter } = (await req.json()) as {
      resident_id: string;
      credential_id: string;
      counter: number;
    };

    if (!resident_id || !credential_id || counter === undefined) {
      return new Response(JSON.stringify({ error: 'Manglende felter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch stored credential
    const { data: cred, error: credErr } = await supabase
      .from('resident_webauthn_credentials')
      .select('id, counter')
      .eq('credential_id', credential_id)
      .eq('resident_id', resident_id)
      .single();

    if (credErr || !cred) {
      return new Response(JSON.stringify({ error: 'Ukendt biometri-enhed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Replay-attack protection: new counter must be greater than stored
    if (counter <= cred.counter) {
      return new Response(JSON.stringify({ error: 'Ugyldig tæller – muligt replay-angreb' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update counter
    const { error: updateErr } = await supabase
      .from('resident_webauthn_credentials')
      .update({ counter })
      .eq('id', cred.id);

    if (updateErr) {
      return new Response(JSON.stringify({ error: 'Intern fejl ved opdatering af tæller' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create hashed server session
    const sessionToken = await createResidentSession(supabase, resident_id, req);

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: 'Kunne ikke oprette session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data: { session_token: sessionToken } }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Intern fejl' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

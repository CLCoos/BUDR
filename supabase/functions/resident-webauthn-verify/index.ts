import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { resident_id, credential_id, counter } = await req.json() as {
      resident_id: string;
      credential_id: string;
      counter: number;
    };

    if (!resident_id || !credential_id || counter === undefined) {
      return new Response(
        JSON.stringify({ error: 'Manglende felter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch stored credential
    const { data: cred, error: credErr } = await supabase
      .from('resident_webauthn_credentials')
      .select('id, counter')
      .eq('credential_id', credential_id)
      .eq('resident_id', resident_id)
      .single();

    if (credErr || !cred) {
      return new Response(
        JSON.stringify({ error: 'Ukendt biometri-enhed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Replay-attack protection: new counter must be greater than stored
    if (counter <= cred.counter) {
      return new Response(
        JSON.stringify({ error: 'Ugyldig tæller – muligt replay-angreb' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Update counter
    const { error: updateErr } = await supabase
      .from('resident_webauthn_credentials')
      .update({ counter })
      .eq('id', cred.id);

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: 'Intern fejl ved opdatering af tæller' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: resident, error: residentErr } = await supabase
      .from('care_residents')
      .select('org_id')
      .eq('user_id', resident_id)
      .maybeSingle();

    if (residentErr || !resident?.org_id) {
      return new Response(
        JSON.stringify({ error: 'Kunne ikke oprette session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create session (12 hours)
    const sessionToken = crypto.randomUUID();
    const { error: sessionErr } = await supabase
      .from('resident_sessions')
      .insert({
        resident_user_id: resident_id,
        org_id: resident.org_id,
        session_token_hash: await sha256Hex(sessionToken),
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        user_agent: req.headers.get('user-agent'),
      });

    if (sessionErr) {
      return new Response(
        JSON.stringify({ error: 'Kunne ikke oprette session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ data: { session_token: sessionToken } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Intern fejl' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

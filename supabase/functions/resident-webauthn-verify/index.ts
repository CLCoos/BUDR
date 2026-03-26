import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Create session (12 hours)
    const { data: session, error: sessionErr } = await supabase
      .from('resident_sessions')
      .insert({
        resident_id,
        token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      })
      .select('token')
      .single();

    if (sessionErr || !session) {
      return new Response(
        JSON.stringify({ error: 'Kunne ikke oprette session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ data: { session_token: session.token } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Intern fejl' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

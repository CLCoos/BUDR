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
    const { resident_id, credential_id, public_key, counter, device_label, session_token } =
      await req.json() as {
        resident_id: string;
        credential_id: string;
        public_key: string;
        counter: number;
        device_label?: string;
        session_token: string;
      };

    if (!resident_id || !credential_id || !public_key || session_token === undefined) {
      return new Response(
        JSON.stringify({ error: 'Manglende felter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Validate session token
    const { data: session, error: sessionErr } = await supabase
      .from('resident_sessions')
      .select('resident_id')
      .eq('token', session_token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionErr || !session || session.resident_id !== resident_id) {
      return new Response(
        JSON.stringify({ error: 'Ugyldig eller udløbet session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Insert credential
    const { error: insertErr } = await supabase
      .from('resident_webauthn_credentials')
      .insert({ resident_id, credential_id, public_key, counter, device_label });

    if (insertErr) {
      return new Response(
        JSON.stringify({ error: 'Kunne ikke registrere biometri' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ data: { success: true } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Intern fejl' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

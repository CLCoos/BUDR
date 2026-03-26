import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
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
    const { resident_id, pin } = await req.json() as { resident_id: string; pin: string };

    if (!resident_id || !pin) {
      return new Response(
        JSON.stringify({ error: 'Manglende felter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // PIN must be exactly 4 digits
    if (!/^\d{4}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: 'Ugyldig PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch stored hash
    const { data: pinRow, error: pinErr } = await supabase
      .from('resident_pins')
      .select('pin_hash')
      .eq('resident_id', resident_id)
      .single();

    if (pinErr || !pinRow) {
      return new Response(
        JSON.stringify({ error: 'Ugyldig PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const valid = await bcrypt.compare(pin, pinRow.pin_hash);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: 'Ugyldig PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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

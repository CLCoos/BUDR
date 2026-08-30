import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { resident_id, pin, staff_token } = await req.json() as {
      resident_id: string;
      pin: string;
      staff_token: string;
    };

    if (!resident_id || !pin || !staff_token) {
      return new Response(
        JSON.stringify({ error: 'Manglende felter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!UUID_RE.test(resident_id)) {
      return new Response(
        JSON.stringify({ error: 'Ugyldigt resident_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!/^\d{4}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: 'PIN skal være præcis 4 cifre' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Validate staff JWT
    const { data: { user }, error: authErr } = await supabase.auth.getUser(staff_token);
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Ikke autoriseret – kun personale kan sætte PIN' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Require care_staff row — any Auth user must not be able to reset PINs.
    const { data: staff, error: staffErr } = await supabase
      .from('care_staff')
      .select('id, org_id')
      .eq('id', user.id)
      .maybeSingle();

    if (staffErr || !staff?.org_id) {
      return new Response(
        JSON.stringify({ error: 'Ikke autoriseret – kun personale kan sætte PIN' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: resident, error: residentErr } = await supabase
      .from('care_residents')
      .select('user_id, org_id')
      .eq('user_id', resident_id)
      .maybeSingle();

    if (residentErr || !resident?.org_id) {
      return new Response(
        JSON.stringify({ error: 'Beboer ikke fundet' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Same-org only — mirrors src/lib/residentPinAuth.ts staffMaySetResidentPin.
    if (resident.org_id !== staff.org_id) {
      return new Response(
        JSON.stringify({ error: 'Ingen adgang til beboer' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Hash and store via pgcrypto SQL function (service_role only after migration revoke).
    const { error: rpcErr } = await supabase
      .rpc('set_resident_pin', { p_resident_id: resident_id, p_pin: pin });

    if (rpcErr) {
      return new Response(
        JSON.stringify({ error: 'Kunne ikke gemme PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ data: { success: true } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ error: 'Intern fejl' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * FAIL-CLOSED: previous implementation minted a resident session after only
 * checking that a client-supplied counter was greater than the stored counter.
 * It never verified the WebAuthn assertion signature against the stored public
 * key, and the challenge was generated client-side (never bound server-side).
 *
 * Anyone who knew (or guessed) a registered credential_id could call this
 * endpoint with counter = stored+1 and receive a valid session_token.
 *
 * Re-enable only with: server-stored challenge + cryptographic assertion verify
 * (e.g. @simplewebauthn/server) before minting a session.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      error:
        'Biometrisk login er midlertidigt deaktiveret – brug PIN. Kryptografisk WebAuthn-verifikation mangler.',
    }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

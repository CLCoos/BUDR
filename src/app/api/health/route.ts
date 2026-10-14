import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Let sundhedstjek. Kaldes hvert 5. minut af `netlify/functions/keep-warm.mts`, så Next.js-
 * serverfunktionen (og dens forbindelse til Supabase) er varm, når personalet åbner portalen.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabase: 'ok' | 'down' | 'unconfigured' = 'unconfigured';
  if (url && key) {
    try {
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: key },
        cache: 'no-store',
      });
      supabase = res.ok ? 'ok' : 'down';
    } catch {
      supabase = 'down';
    }
  }
  return NextResponse.json({ ok: true, supabase });
}

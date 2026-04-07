import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/portal/logout — signs the staff member out and redirects to the
 * login page. Accepts GET so it can be triggered from a plain anchor/link as
 * well as programmatically (fetch or router.push).
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL('/care-portal-login', request.url));
}

/** POST variant — usable from form actions or fetch calls. */
export async function POST(request: Request) {
  return GET(request);
}

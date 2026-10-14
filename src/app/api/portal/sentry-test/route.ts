import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/portal/sentry-test
 * Sender én testfejl til Sentry, så man kan se at fejlovervågningen virker i produktion.
 * Kun for indlogget portalpersonale. Indeholder ingen borger- eller brugerdata.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: staffRow } = await supabase
    .from('care_staff')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (!staffRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const serverDsnSet = Boolean(process.env.SENTRY_DSN);
  const clientDsnSet = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const hasClient = Boolean(Sentry.getClient());
  const sdkEnabled = Boolean(Sentry.getClient()?.getOptions().enabled);

  const eventId = Sentry.captureException(
    new Error('BUDR Sentry-test: denne fejl er sendt med vilje')
  );
  // Serverless-funktionen kan lukke før afsendelse, så vent kort på at fejlen er sendt.
  const flushed = await Sentry.flush(3000);

  return NextResponse.json({
    serverDsnSet,
    clientDsnSet,
    hasClient,
    sdkEnabled,
    nodeEnv: process.env.NODE_ENV,
    eventId,
    flushed,
  });
}

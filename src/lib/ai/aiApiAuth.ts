import { getResidentId } from '@/lib/residentAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type AiApiCaller =
  | { ok: true; kind: 'resident' | 'staff' | 'dev' }
  | { ok: false; status: 401 | 503; message: string };

/**
 * AI proxy endpoints must not be publicly callable in production.
 * Accepts resident cookie or authenticated staff session.
 * Non-production allows unauthenticated calls for local/demo tooling.
 */
export async function assertAiApiCaller(): Promise<AiApiCaller> {
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true, kind: 'dev' };
  }

  const residentId = await getResidentId();
  if (residentId) {
    return { ok: true, kind: 'resident' };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, status: 503, message: 'Server ikke konfigureret' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  return { ok: true, kind: 'staff' };
}

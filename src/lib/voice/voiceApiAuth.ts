import { getResidentId } from '@/lib/residentAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * TTS/STT må kaldes af indlogget beboer (resident-cookie) eller staff (Supabase session).
 * I development tillades kald uden session, så `/lys-voice-test` matcher sidens adgang
 * (localhost — ikke i production).
 */
export async function assertVoiceApiCaller(): Promise<
  { ok: true; kind: 'resident' | 'staff' } | { ok: false; status: 401 | 503; message: string }
> {
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true, kind: 'staff' };
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

import { requireResidentApiSession } from '@/lib/residentApiSession';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * TTS/STT må kaldes af indlogget beboer (resident-session) eller staff (Supabase session).
 */
export async function assertVoiceApiCaller(): Promise<
  { ok: true; kind: 'resident' | 'staff' } | { ok: false; status: 401 | 503; message: string }
> {
  const resident = await requireResidentApiSession();
  if (resident.ok) {
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
    return { ok: false, status: resident.status, message: resident.message };
  }

  const { data: staffRow, error } = await supabase
    .from('care_staff')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !staffRow) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }
  return { ok: true, kind: 'staff' };
}

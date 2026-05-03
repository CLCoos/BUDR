import { notFound } from 'next/navigation';
import { canAccessLysVoiceTestPage } from '@/lib/lysVoiceTestAccess';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import LysVoiceTestClient from './LysVoiceTestClient';

export default async function LysVoiceTestPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = supabase
    ? await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    : { data: { user: null } };

  if (!canAccessLysVoiceTestPage(user?.email ?? undefined)) {
    notFound();
  }

  return <LysVoiceTestClient />;
}

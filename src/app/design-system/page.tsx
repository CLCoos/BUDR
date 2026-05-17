import { notFound } from 'next/navigation';
import { DesignSystemWithAuth } from '@/app/design-system/DesignSystemWithAuth';
import { canAccessDesignSystemPage } from '@/lib/designSystemAccess';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function DesignSystemPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!canAccessDesignSystemPage(user?.email ?? undefined)) {
    notFound();
  }

  return <DesignSystemWithAuth />;
}

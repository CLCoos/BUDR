import { notFound } from 'next/navigation';
import { DesignSystemShowcase } from '@/components/design-system/DesignSystemShowcase';
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

  return <DesignSystemShowcase />;
}

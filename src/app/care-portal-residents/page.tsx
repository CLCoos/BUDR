import React from 'react';
import { redirect } from 'next/navigation';
import PortalShell from '@/components/PortalShell';
import ResidentsOpsClient from './ResidentsOpsClient';
import { requirePortalAuth } from '@/lib/portalAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function CarePortalResidentsSimPage() {
  const user = await requirePortalAuth();
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect('/care-portal-login?err=config');

  const { data: me } = await supabase
    .from('care_staff')
    .select('org_id, role')
    .eq('id', user.id)
    .single<{ org_id: string; role: string | null }>();
  if (!me?.org_id || me.role !== 'leder') {
    redirect('/care-portal-dashboard?error=unauthorized');
  }

  const { data: residents } = await supabase
    .from('care_residents')
    .select('user_id, display_name, created_at')
    .eq('org_id', me.org_id)
    .order('created_at', { ascending: false });

  return (
    <PortalShell>
      <ResidentsOpsClient residents={residents ?? []} />
    </PortalShell>
  );
}

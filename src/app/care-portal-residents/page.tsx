import React from 'react';
import { redirect } from 'next/navigation';
import PortalShell from '@/components/PortalShell';
import ResidentsOpsClient from './ResidentsOpsClient';
import { requirePortalAuth } from '@/lib/portalAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { NameDisplayMode } from '@/lib/residents/formatName';

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
    .select('user_id, first_name, last_name, display_name, created_at')
    .eq('org_id', me.org_id)
    .order('created_at', { ascending: false });

  const { data: org } = await supabase
    .from('organisations')
    .select('resident_name_display_mode')
    .eq('id', me.org_id)
    .maybeSingle();
  const residentNameDisplayMode: NameDisplayMode =
    org?.resident_name_display_mode === 'full_name' ||
    org?.resident_name_display_mode === 'initials_only'
      ? org.resident_name_display_mode
      : 'first_name_initial';

  return (
    <PortalShell>
      <ResidentsOpsClient
        residents={residents ?? []}
        residentNameDisplayMode={residentNameDisplayMode}
      />
    </PortalShell>
  );
}

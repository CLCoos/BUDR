'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseStaffOrgId } from '@/lib/staffOrgScope';

export interface ImportRow {
  display_name: string;
  room: string;
  move_in_date: string;
  primary_contact: string;
  primary_contact_phone: string;
  primary_contact_relation: string;
}

export interface ImportResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function importResidentsAction(rows: ImportRow[]): Promise<ImportResult> {
  const server = await createServerSupabaseClient();
  if (!server) {
    return {
      inserted: 0,
      skipped: 0,
      errors: ['Serveren er ikke konfigureret til Supabase (mangler URL/nøgle).'],
    };
  }
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return {
      inserted: 0,
      skipped: 0,
      errors: ['Du skal være logget ind i Care Portal for at importere.'],
    };
  }
  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!orgId) {
    return {
      inserted: 0,
      skipped: 0,
      errors: [
        'Din bruger mangler gyldig org_id i Supabase Auth (User metadata). Uden organisation kan vi ikke knytte beboere til jeres bosted.',
      ],
    };
  }

  const supabase = getServiceClient();

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const name = row.display_name.trim();
    if (!name) {
      skipped++;
      continue;
    }

    const parts = name.split(/\s+/).filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');

    const onboarding_data = {
      avatar_initials: initials,
      room: row.room.trim() || '—',
      move_in_date: row.move_in_date.trim() || null,
      primary_contact: row.primary_contact.trim() || null,
      primary_contact_phone: row.primary_contact_phone.trim() || null,
      primary_contact_relation: row.primary_contact_relation.trim() || null,
    };

    const { error } = await supabase.from('care_residents').insert({
      display_name: name,
      onboarding_data,
      org_id: orgId,
    });

    if (error) {
      errors.push(`${name}: ${error.message}`);
    } else {
      inserted++;
    }
  }

  return { inserted, skipped, errors };
}

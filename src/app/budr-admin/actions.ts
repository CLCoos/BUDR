'use server';

import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export type CreateOrgResult =
  | {
      ok: true;
      orgName: string;
      slug: string;
      inviteCode: string;
      inviteLink: string;
    }
  | { ok: false; error: string };

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateInviteCode(): string {
  return randomBytes(18).toString('base64url');
}

export async function createOrganisationAction(
  _prevState: CreateOrgResult | null,
  formData: FormData
): Promise<CreateOrgResult> {
  const providedSecret = (formData.get('admin_secret') as string | null)?.trim() ?? '';
  const orgName = (formData.get('org_name') as string | null)?.trim() ?? '';
  const rawSlug = (formData.get('slug') as string | null)?.trim() ?? '';
  const slug = normalizeSlug(rawSlug);

  const adminSecret = process.env.BUDR_ADMIN_SECRET ?? '';
  if (!adminSecret) {
    return { ok: false, error: 'BUDR_ADMIN_SECRET mangler i miljøet.' };
  }
  if (providedSecret !== adminSecret) {
    return { ok: false, error: 'Forkert admin secret.' };
  }
  if (!orgName) {
    return { ok: false, error: 'Org-navn er påkrævet.' };
  }
  if (!slug || slug.length < 2) {
    return { ok: false, error: 'Slug skal være mindst 2 tegn (a-z, 0-9, -).' };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { ok: false, error: 'Supabase er ikke konfigureret korrekt på serveren.' };
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const { error } = await admin.from('organisations').insert({
      name: orgName,
      slug,
      invite_code: inviteCode,
    });

    if (!error) {
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:4028').replace(
        /\/$/,
        ''
      );
      return {
        ok: true,
        orgName,
        slug,
        inviteCode,
        inviteLink: `${siteUrl}/invite/${inviteCode}`,
      };
    }

    if (error.code === '23505') {
      if (error.message.toLowerCase().includes('slug')) {
        return { ok: false, error: 'Slug findes allerede. Vælg en anden.' };
      }
      // If invite_code collided, retry.
      continue;
    }

    return { ok: false, error: error.message };
  }

  return { ok: false, error: 'Kunne ikke generere unik invite-kode. Prøv igen.' };
}

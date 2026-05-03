import { NextResponse } from 'next/server';
import { PERMISSIONS } from '@/lib/permissions';
import { hasPortalPermission } from '@/lib/portalPermissions';
import { requirePortalAuth } from '@/lib/portalAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import { isKnownElevenLabsVoiceId } from '@/lib/voice/voices';

export async function GET() {
  const user = await requirePortalAuth();
  const supabase = await createServerSupabaseClient();
  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!supabase || !orgId) {
    return NextResponse.json({ error: 'Org mangler' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('organisations')
    .select('lys_default_voice_id')
    .eq('id', orgId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const voiceId =
    typeof data?.lys_default_voice_id === 'string' &&
    isKnownElevenLabsVoiceId(data.lys_default_voice_id)
      ? data.lys_default_voice_id
      : null;
  return NextResponse.json({ lys_default_voice_id: voiceId });
}

export async function PATCH(req: Request) {
  const user = await requirePortalAuth();
  const canManage = await hasPortalPermission(PERMISSIONS.MANAGE_ROLES);
  if (!canManage) {
    return NextResponse.json({ error: 'Manglende rettighed' }, { status: 403 });
  }
  const supabase = await createServerSupabaseClient();
  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!supabase || !orgId) {
    return NextResponse.json({ error: 'Org mangler' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { lys_default_voice_id?: unknown };
  if (!('lys_default_voice_id' in body)) {
    return NextResponse.json({ error: 'Mangler lys_default_voice_id' }, { status: 400 });
  }
  const raw = body.lys_default_voice_id;
  if (raw !== null && (typeof raw !== 'string' || !isKnownElevenLabsVoiceId(raw.trim()))) {
    return NextResponse.json({ error: 'Ugyldigt stemme-id' }, { status: 400 });
  }

  const value = raw === null ? null : String(raw).trim();

  const { error } = await supabase
    .from('organisations')
    .update({ lys_default_voice_id: value })
    .eq('id', orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, lys_default_voice_id: value });
}

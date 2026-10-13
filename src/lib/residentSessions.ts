import { createHash, randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SESSION_COOKIE = 'budr_resident_session';
const LEGACY_COOKIE = 'budr_resident_id';
const SESSION_TTL_DAYS = 30;
const LOGIN_TOKEN_TTL_MINUTES = 30;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export type SessionValidation =
  | { valid: true; residentUserId: string; orgId: string; sessionId: string }
  | { valid: false; reason: 'no_cookie' | 'not_found' | 'expired' | 'revoked' };

export async function validateSessionToken(token: string): Promise<SessionValidation> {
  if (!token) return { valid: false, reason: 'no_cookie' };

  const supabase = getServiceClient();
  if (!supabase) return { valid: false, reason: 'not_found' };

  const { data, error } = await supabase
    .from('resident_sessions')
    .select('id, resident_user_id, org_id, expires_at, revoked_at')
    .eq('session_token_hash', hashToken(token))
    .maybeSingle();

  if (error || !data) return { valid: false, reason: 'not_found' };
  if (data.revoked_at) return { valid: false, reason: 'revoked' };
  if (new Date(data.expires_at) < new Date()) return { valid: false, reason: 'expired' };

  void supabase
    .from('resident_sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return {
    valid: true,
    residentUserId: data.resident_user_id,
    orgId: data.org_id,
    sessionId: data.id,
  };
}

export async function createSession(opts: {
  residentUserId: string;
  userAgent?: string;
  ipHash?: string;
}): Promise<{ token: string; expiresAt: Date } | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;

  const { data: resident, error: rErr } = await supabase
    .from('care_residents')
    .select('org_id')
    .eq('user_id', opts.residentUserId)
    .maybeSingle();

  if (rErr || !resident?.org_id) return null;

  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from('resident_sessions').insert({
    resident_user_id: opts.residentUserId,
    org_id: resident.org_id,
    session_token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
    user_agent: opts.userAgent ?? null,
    ip_hash: opts.ipHash ?? null,
  });

  if (error) return null;
  return { token, expiresAt };
}

/**
 * Engangs-login-link udstedt af personale. Returnerer det rå token (vises kun én gang);
 * kun hash gemmes. Kalderen skal selv have tjekket, at medarbejderen må se borgeren.
 */
export async function createLoginToken(opts: {
  residentUserId: string;
  orgId: string;
  createdBy: string;
}): Promise<{ token: string; expiresAt: Date } | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;

  const token = generateToken();
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_MINUTES * 60 * 1000);

  const { error } = await supabase.from('resident_login_tokens').insert({
    resident_user_id: opts.residentUserId,
    org_id: opts.orgId,
    token_hash: hashToken(token),
    created_by: opts.createdBy,
    expires_at: expiresAt.toISOString(),
  });

  if (error) return null;
  return { token, expiresAt };
}

/**
 * Indløser et login-link: markerer det brugt (atomisk — kun ét kald kan vinde)
 * og opretter en resident_session. Udløbne, brugte eller ukendte tokens afvises.
 */
export async function redeemLoginToken(opts: {
  token: string;
  userAgent?: string;
  ipHash?: string;
}): Promise<{ token: string; expiresAt: Date; residentUserId: string } | null> {
  if (!opts.token) return null;
  const supabase = getServiceClient();
  if (!supabase) return null;

  const { data: claimed, error } = await supabase
    .from('resident_login_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token_hash', hashToken(opts.token))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('id, resident_user_id')
    .maybeSingle();

  if (error || !claimed) return null;

  const session = await createSession({
    residentUserId: claimed.resident_user_id,
    userAgent: opts.userAgent,
    ipHash: opts.ipHash,
  });
  if (!session) return null;

  return { ...session, residentUserId: claimed.resident_user_id };
}

export async function revokeSession(opts: {
  sessionId: string;
  /** care_staff.id; udelades når borgeren selv logger ud */
  revokedBy?: string;
  reason?: string;
}): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('resident_sessions')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: opts.revokedBy ?? null,
      revoke_reason: opts.reason ?? null,
    })
    .eq('id', opts.sessionId)
    .is('revoked_at', null);

  return !error;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const LEGACY_COOKIE_NAME = LEGACY_COOKIE;

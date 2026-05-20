import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  validateSessionToken,
  SESSION_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
} from '@/lib/residentSessions';

interface Props {
  params: Promise<{ resident_id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * Entry point for device-linked resident access. It never creates sessions from
 * the URL alone; a valid PIN/WebAuthn-backed server session is required first.
 */
async function bootstrapSession(residentId: string): Promise<{ valid: boolean }> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (existingToken) {
    const validation = await validateSessionToken(existingToken);
    if (validation.valid && validation.residentUserId === residentId) {
      cookieStore.set(LEGACY_COOKIE_NAME, residentId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
      });
      return { valid: true };
    }
  }

  return { valid: false };
}

export default async function ResidentEntryPage({ params }: Props) {
  const { resident_id } = await params;

  if (!UUID_RE.test(resident_id)) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Ugyldigt link</h1>
        <p className="mt-2 text-sm text-slate-600">Borger-id&apos;et i linket er ikke gyldigt.</p>
      </main>
    );
  }

  const boot = await bootstrapSession(resident_id);
  if (!boot.valid) {
    redirect(`/login/${resident_id}`);
  }

  redirect('/park-hub');
}

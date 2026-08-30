import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PinLoginScreen from '@/app/login/[resident_id]/PinLoginScreen';
import { sanitizeNext } from '@/lib/redirectSafety';
import { SESSION_COOKIE_NAME, validateSessionToken } from '@/lib/residentSessions';
import { isValidUuid } from '@/lib/uuid';

interface Props {
  params: Promise<{ resident_id: string }>;
  searchParams?: Promise<{ next?: string | string[] }>;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadResidentProfile(residentId: string): Promise<{
  name: string;
  initials: string;
} | null> {
  const supabase = getServiceClient();
  if (!supabase) return { name: 'Beboer', initials: '?' };

  const { data, error } = await supabase
    .from('care_residents')
    .select('first_name,last_name,display_name,onboarding_data')
    .eq('user_id', residentId)
    .maybeSingle();

  if (error || !data) return null;

  const firstName = typeof data.first_name === 'string' ? data.first_name.trim() : '';
  const lastName = typeof data.last_name === 'string' ? data.last_name.trim() : '';
  const displayName = typeof data.display_name === 'string' ? data.display_name.trim() : '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || displayName || 'Beboer';
  const onboarding = (data.onboarding_data ?? {}) as Record<string, unknown>;
  const rawInitials = onboarding.avatar_initials;
  const initials =
    typeof rawInitials === 'string' && rawInitials.trim()
      ? rawInitials.trim().slice(0, 4).toUpperCase()
      : name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part.charAt(0).toUpperCase())
          .join('') || '?';

  return { name, initials };
}

export default async function ResidentEntryPage({ params, searchParams }: Props) {
  const { resident_id } = await params;
  const query = searchParams ? await searchParams : {};
  const rawNext = Array.isArray(query.next) ? query.next[0] : query.next;
  const next = sanitizeNext(rawNext);

  if (!isValidUuid(resident_id)) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Ugyldigt link</h1>
        <p className="mt-2 text-sm text-slate-600">Borger-id&apos;et i linket er ikke gyldigt.</p>
      </main>
    );
  }

  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    const validation = await validateSessionToken(sessionToken);
    if (validation.valid && validation.residentUserId === resident_id) {
      redirect(next);
    }
  }

  const profile = await loadResidentProfile(resident_id);
  if (!profile) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Ugyldigt link</h1>
        <p className="mt-2 text-sm text-slate-600">
          Borgeren findes ikke længere. Kontakt personalet, hvis linket burde virke.
        </p>
      </main>
    );
  }

  return (
    <PinLoginScreen
      residentId={resident_id}
      redirectTo={next}
      residentName={profile.name}
      residentInitials={profile.initials}
    />
  );
}

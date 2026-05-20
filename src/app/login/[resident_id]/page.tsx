import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { SESSION_COOKIE_NAME, validateSessionToken } from '@/lib/residentSessions';
import PinLoginScreen from './PinLoginScreen';

interface Props {
  params: Promise<{ resident_id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function deriveInitials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

async function getResidentDisplay(residentId: string): Promise<{
  name?: string;
  initials?: string;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return {};

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await supabase
    .from('care_residents')
    .select('display_name, onboarding_data')
    .eq('user_id', residentId)
    .maybeSingle();

  const name = typeof data?.display_name === 'string' ? data.display_name : undefined;
  const onboardingData = (data?.onboarding_data as Record<string, unknown> | null) ?? null;
  const initials =
    typeof onboardingData?.avatar_initials === 'string'
      ? onboardingData.avatar_initials
      : name
        ? deriveInitials(name)
        : undefined;

  return { name, initials };
}

export default async function LoginPage({ params }: Props) {
  const { resident_id } = await params;
  if (!UUID_RE.test(resident_id)) {
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
      redirect('/park-hub');
    }
  }

  const display = await getResidentDisplay(resident_id);
  return (
    <PinLoginScreen
      residentId={resident_id}
      redirectTo="/park-hub"
      residentName={display.name}
      residentInitials={display.initials}
    />
  );
}

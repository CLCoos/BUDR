import { createClient } from '@supabase/supabase-js';
import PinLoginScreen from './PinLoginScreen';
import { sanitizeNext } from '@/lib/redirectSafety';
import { isValidUuid } from '@/lib/uuid';

interface Props {
  params: Promise<{ resident_id: string }>;
  searchParams?: Promise<{ next?: string }>;
}

function deriveInitials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

async function getResidentLoginProfile(residentId: string): Promise<{
  name?: string;
  initials?: string;
} | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return {};

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('care_residents')
    .select('display_name, onboarding_data')
    .eq('user_id', residentId)
    .maybeSingle();

  if (error || !data) return null;

  const displayName = typeof data.display_name === 'string' ? data.display_name : undefined;
  const onboardingData = (data.onboarding_data as Record<string, unknown> | null) ?? null;
  const initials =
    typeof onboardingData?.avatar_initials === 'string'
      ? onboardingData.avatar_initials
      : displayName
        ? deriveInitials(displayName)
        : undefined;

  return { name: displayName, initials };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { resident_id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const redirectTo = sanitizeNext(resolvedSearchParams.next);

  if (!isValidUuid(resident_id)) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Ugyldigt link</h1>
        <p className="mt-2 text-sm text-slate-600">Borger-id&apos;et i linket er ikke gyldigt.</p>
      </main>
    );
  }

  const profile = await getResidentLoginProfile(resident_id);
  if (profile === null) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Linket er ikke aktivt</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kontakt personalet, hvis du mener, at linket burde virke.
        </p>
      </main>
    );
  }

  return (
    <PinLoginScreen
      residentId={resident_id}
      redirectTo={redirectTo}
      residentName={profile.name}
      residentInitials={profile.initials}
    />
  );
}

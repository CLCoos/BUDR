import { createClient } from '@supabase/supabase-js';
import { sanitizeNext } from '@/lib/redirectSafety';
import PinLoginScreen from './PinLoginScreen';

interface Props {
  params: Promise<{ resident_id: string }>;
  searchParams?: Promise<{ next?: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function initials(name: string | null | undefined): string {
  const parts = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { resident_id } = await params;
  const query = searchParams ? await searchParams : {};
  const redirectTo = sanitizeNext(query.next);

  if (!UUID_RE.test(resident_id)) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Ugyldigt link</h1>
        <p className="mt-2 text-sm text-slate-600">Borger-id&apos;et i linket er ikke gyldigt.</p>
      </main>
    );
  }

  const supabase = getServiceClient();
  const { data: resident } = supabase
    ? await supabase
        .from('care_residents')
        .select('display_name, first_name')
        .eq('user_id', resident_id)
        .maybeSingle()
    : { data: null };

  const residentName =
    (typeof resident?.display_name === 'string' && resident.display_name.trim()) ||
    (typeof resident?.first_name === 'string' && resident.first_name.trim()) ||
    'Beboer';

  return (
    <PinLoginScreen
      residentId={resident_id}
      redirectTo={redirectTo}
      residentName={residentName}
      residentInitials={initials(residentName)}
    />
  );
}

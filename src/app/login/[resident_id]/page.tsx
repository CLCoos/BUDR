import PinLoginScreen from './PinLoginScreen';

interface Props {
  params: Promise<{ resident_id: string }>;
  searchParams?: Promise<{ next?: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeNext(next: string | undefined): string {
  const fallback = '/park-hub';
  if (!next || !next.startsWith('/') || next.includes('//') || next.includes(':')) {
    return fallback;
  }
  return next;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { resident_id } = await params;
  const sp = searchParams ? await searchParams : undefined;
  if (!UUID_RE.test(resident_id)) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Ugyldigt link</h1>
        <p className="mt-2 text-sm text-slate-600">Borger-id&apos;et i linket er ikke gyldigt.</p>
      </main>
    );
  }

  return <PinLoginScreen residentId={resident_id} redirectTo={sanitizeNext(sp?.next)} />;
}

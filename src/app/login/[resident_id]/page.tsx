import PinLoginScreen from './PinLoginScreen';
import { sanitizeNext } from '@/lib/redirectSafety';
import { isValidUuid } from '@/lib/uuid';

interface Props {
  params: Promise<{ resident_id: string }>;
  searchParams?: Promise<{ next?: string }>;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { resident_id } = await params;
  const next = sanitizeNext((await searchParams)?.next);

  if (!isValidUuid(resident_id)) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Ugyldigt link</h1>
        <p className="mt-2 text-sm text-slate-600">Borger-id&apos;et i linket er ikke gyldigt.</p>
      </main>
    );
  }

  return <PinLoginScreen residentId={resident_id} redirectTo={next} />;
}

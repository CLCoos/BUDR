import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ resident_id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  redirect(`/api/resident-auth/session?rid=${resident_id}&next=/park-hub`);
}

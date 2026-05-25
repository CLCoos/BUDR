import { redirect } from 'next/navigation';
import { isValidUuid } from '@/lib/uuid';

interface Props {
  params: Promise<{ resident_id: string }>;
}

export default async function ResidentEntryPage({ params }: Props) {
  const { resident_id } = await params;
  if (!isValidUuid(resident_id)) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Ugyldigt link</h1>
        <p className="mt-2 text-sm text-slate-600">Borger-id&apos;et i linket er ikke gyldigt.</p>
      </main>
    );
  }
  redirect(`/login/${resident_id}?next=/park-hub`);
}

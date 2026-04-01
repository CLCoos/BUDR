import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ resident_id: string }>;
}

// Legacy login URL — now redirects to the direct-access entry point.
export default async function LoginPage({ params }: Props) {
  const { resident_id } = await params;
  redirect(`/app/${resident_id}`);
}

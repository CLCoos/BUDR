import PinLoginScreen from './PinLoginScreen';

interface Props {
  params: Promise<{ resident_id: string }>;
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { resident_id } = await params;
  const { redirect } = await searchParams;

  // In production: fetch resident name/avatar from Supabase here (server component)
  // For now: pass resident_id to client and let it render with a safe fallback
  return (
    <PinLoginScreen
      residentId={resident_id}
      redirectTo={redirect ?? '/park-hub'}
    />
  );
}

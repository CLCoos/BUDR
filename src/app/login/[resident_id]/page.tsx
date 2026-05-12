import PinLoginScreen from './PinLoginScreen';

interface Props {
  params: Promise<{ resident_id: string }>;
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}

function safeRedirectTo(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/park-hub';
  return raw;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { resident_id } = await params;
  const query = await searchParams;
  return <PinLoginScreen residentId={resident_id} redirectTo={safeRedirectTo(query.redirectTo)} />;
}

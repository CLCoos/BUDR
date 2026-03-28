import { createClient } from '@supabase/supabase-js';
import PinLoginScreen from './PinLoginScreen';

interface Props {
  params: Promise<{ resident_id: string }>;
  searchParams: Promise<{ redirect?: string }>;
}

async function getResidentName(residentId: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
      .from('care_residents')
      .select('display_name, onboarding_data')
      .eq('user_id', residentId)
      .single();
    if (!data) return null;
    return {
      name: (data.display_name as string).split(' ')[0], // first name only
      initials: (data.onboarding_data as Record<string, string>)?.avatar_initials ?? '?',
    };
  } catch {
    return null;
  }
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { resident_id } = await params;
  const { redirect } = await searchParams;

  const resident = await getResidentName(resident_id);

  return (
    <PinLoginScreen
      residentId={resident_id}
      redirectTo={redirect ?? '/park-hub'}
      residentName={resident?.name}
      residentInitials={resident?.initials}
    />
  );
}

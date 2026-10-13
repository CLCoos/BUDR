import { redirect } from 'next/navigation';

// Den gamle «BUDR2.0»-onboarding gemte intet og er afløst af Lys-introduktionen
// (park-hub → LysOnboarding). Gamle links sendes videre dertil.
export default function OnboardingPage() {
  redirect('/park-hub');
}

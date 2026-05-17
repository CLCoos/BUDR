'use client';

import { AuthenticatedUserProvider } from '@/contexts/AuthenticatedUserContext';

export default function CarePortalSetupLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedUserProvider>{children}</AuthenticatedUserProvider>;
}

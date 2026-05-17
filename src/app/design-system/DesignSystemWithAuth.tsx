'use client';

import { AuthenticatedUserProvider } from '@/contexts/AuthenticatedUserContext';
import { DesignSystemShowcase } from '@/components/design-system/DesignSystemShowcase';

export function DesignSystemWithAuth() {
  return (
    <AuthenticatedUserProvider>
      <DesignSystemShowcase />
    </AuthenticatedUserProvider>
  );
}

'use client';

import { BINGBONG_DEMO_ORG_SLUG } from '@/lib/bingbongOrg';
import { useAuthenticatedUser } from '@/lib/auth/useAuthenticatedUser';

/** True when logged-in staff org matches BingBong demo seed (`organisations.slug`). */
export function useStaffOrgIsBingbong(): { isBingbong: boolean; ready: boolean } {
  const authState = useAuthenticatedUser();

  if (authState.status === 'loading') {
    return { isBingbong: false, ready: false };
  }
  if (authState.status !== 'authenticated') {
    return { isBingbong: false, ready: true };
  }

  const slug = authState.org.slug?.trim() ?? '';
  return {
    isBingbong: slug === BINGBONG_DEMO_ORG_SLUG,
    ready: true,
  };
}

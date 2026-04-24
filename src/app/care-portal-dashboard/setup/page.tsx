'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, EmptyState } from '@/components/ui';
import { useAuthenticatedUser, type IncompleteReason } from '@/lib/auth/useAuthenticatedUser';
import styles from './page.module.css';

const MESSAGES: Record<IncompleteReason, { title: string; description: string }> = {
  missing_org_id: {
    title: 'Vi skal lige koble din konto til et bosted',
    description:
      'Din login virker, men kontoen er endnu ikke knyttet til en organisation. Bed din leder om et invitationslink eller kontakt BUDR-support.',
  },
  org_not_found: {
    title: 'Din organisation kan ikke findes',
    description:
      'Organisationen bag din konto findes ikke laengere. Kontakt BUDR-support, saa hjaelper vi dig videre med det samme.',
  },
  org_deactivated: {
    title: 'Din organisation er midlertidigt sat paa pause',
    description:
      'Adgangen er midlertidigt deaktiveret for organisationen. Kontakt din leder eller BUDR-support for genaktivering.',
  },
  no_care_staff_row: {
    title: 'Din medarbejderprofil mangler',
    description:
      'Din konto er knyttet til en organisation, men medarbejderprofilen er ikke oprettet endnu. Din leder eller BUDR-support kan rette det hurtigt.',
  },
};

export default function CarePortalSetupPage() {
  const router = useRouter();
  const authState = useAuthenticatedUser();

  useEffect(() => {
    if (authState.status === 'authenticated') {
      router.replace('/care-portal-dashboard');
    } else if (authState.status === 'unauthenticated') {
      router.replace('/care-portal-login');
    }
  }, [authState, router]);

  if (authState.status === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.card} aria-busy>
          <Card padding="lg">Indlaeser konto...</Card>
        </div>
      </div>
    );
  }

  if (authState.status !== 'authenticated-incomplete') return null;

  const msg = MESSAGES[authState.reason];

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Card padding="lg">
          <EmptyState
            title={msg.title}
            description={msg.description}
            actions={
              <Button
                onClick={() =>
                  window.location.assign(
                    'mailto:support@budrcare.dk?subject=Hjaelp%20til%20kontoopsaetning'
                  )
                }
              >
                Kontakt support
              </Button>
            }
          />
        </Card>
      </div>
    </div>
  );
}

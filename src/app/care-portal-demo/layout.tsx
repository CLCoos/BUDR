import type { Metadata } from 'next';
import CarePortalDemoShell from '@/components/demo/CarePortalDemoShell';

export const metadata: Metadata = {
  title: 'Care Portal (DEMO)',
  description:
    'Interaktiv demo af BUDR Care Portal med fiktive beboere og data. Ikke produktion eller journal.',
};

export default function CarePortalDemoLayout({ children }: { children: React.ReactNode }) {
  return <CarePortalDemoShell>{children}</CarePortalDemoShell>;
}

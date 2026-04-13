import type { Metadata } from 'next';
import CareEntrySplit from '@/components/marketing/CareEntrySplit';
import './care-entry-landing.css';

export const metadata: Metadata = {
  title: 'BUDR Care — Portal til pædagoger og ledere i socialpsykiatrien',
  description:
    'Lys og Care Portal i ét flow: realtid fra borgeren til teamet, journal- og planstøtte, medicinoverblik og AI som udkast med jeres godkendelse — så I kan handle i tide og møde borgeren med værdighed.',
  openGraph: {
    title: 'BUDR Care — Lys og Care Portal til botilbud',
    description:
      'Borger-app og portal i samme økosystem: dokumentation, medicin og varsler — til socialpsykiatriske botilbud.',
  },
};

export default function HomePage() {
  return <CareEntrySplit />;
}

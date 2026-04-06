import type { Metadata } from 'next';
import { DM_Sans, DM_Serif_Display } from 'next/font/google';
import HomeLanding from '@/components/marketing/HomeLanding';
import ParkLoginNotice from '@/components/marketing/ParkLoginNotice';
import './budr-landing.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600'],
  variable: '--font-landing-body',
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  display: 'swap',
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-budr-wordmark',
});

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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ park?: string }>;
}) {
  const sp = await searchParams;
  const showParkLogin = sp.park === 'login';

  return (
    <>
      {showParkLogin ? <ParkLoginNotice /> : null}
      <HomeLanding className={`${dmSans.variable} ${dmSerifDisplay.variable}`} />
    </>
  );
}

import type { Metadata } from 'next';
import { DM_Sans, DM_Serif_Display } from 'next/font/google';
import PilotpakkePage from '@/components/marketing/PilotpakkePage';
import '../budr-landing.css';
import './pilotpakke-print.css';

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
  title: 'Pilotpakke (8–12 uger) — BUDR Care til botilbud',
  description:
    'Konkret pilotpakke: leverancer fra BUDR, forudsætninger fra bostedet, måling ved tid til overblik, journal-kladder, borgerinvolvering og medarbejderpulse. Gem som PDF via print.',
  openGraph: {
    title: 'Pilotpakke BUDR Care — leverancer, bidrag og måling',
    description:
      'Én webside til ledelse og økonomi: hvad piloten indeholder, hvad I stiller med, og hvordan I måler succes.',
  },
  alternates: { canonical: '/pilotpakke' },
};

export default function PilotpakkeRoute() {
  return <PilotpakkePage className={`${dmSans.variable} ${dmSerifDisplay.variable}`.trim()} />;
}

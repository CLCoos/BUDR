import type { Metadata } from 'next';
import { DM_Sans, DM_Serif_Display } from 'next/font/google';
import InstitutionerPage from '@/components/marketing/InstitutionerPage';
import '../budr-landing.css';

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
  title: 'Institutioner — kommuner og botilbud | BUDR Care',
  description:
    'Målgruppe, implementering, pilot, anonym case og IT/DPO-oversigt (hosting, RLS, journal godkendt/kladde, AI/Anthropic) for BUDR Care.',
  openGraph: {
    title: 'BUDR Care — Institutionssti for kommuner og botilbud',
    description:
      'Beslutningsstøtte: målgruppe, implementering, pilot, tillid og sikkerhed til IT og DPO.',
  },
};

export default function InstitutionerRoute() {
  return <InstitutionerPage className={`${dmSans.variable} ${dmSerifDisplay.variable}`.trim()} />;
}

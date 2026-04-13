import type { Metadata } from 'next';
import InstitutionerPage from '@/components/marketing/InstitutionerPage';
import { marketingFontVariableClassName } from '../marketing-fonts';
import '../budr-landing.css';

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
  return <InstitutionerPage className={marketingFontVariableClassName} />;
}

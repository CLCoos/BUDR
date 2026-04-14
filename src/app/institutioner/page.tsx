import type { Metadata } from 'next';
import InstitutionerPage from '@/components/marketing/InstitutionerPage';
import { marketingFontVariableClassName } from '../marketing-fonts';
import '../budr-landing.css';

export const metadata: Metadata = {
  title: 'Institutioner — kommuner og botilbud | BUDR Care',
  description:
    'BUDR Care til institutioner: hvorfor status quo koster, hvad Care Portal + Lys ændrer, og hvordan I starter med en målbar pilot.',
  openGraph: {
    title: 'BUDR Care — Institutionssti for kommuner og botilbud',
    description:
      'Se hvordan BUDR Care erstatter tung dokumentation med et samlet system til personale og borgere.',
  },
};

export default function InstitutionerRoute() {
  return <InstitutionerPage className={marketingFontVariableClassName} />;
}

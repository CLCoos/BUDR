import type { Metadata } from 'next';
import PilotpakkePage from '@/components/marketing/PilotpakkePage';
import { marketingFontVariableClassName } from '../marketing-fonts';
import '../budr-landing.css';
import './pilotpakke-print.css';

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
  return <PilotpakkePage className={marketingFontVariableClassName} />;
}

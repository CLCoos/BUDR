import type { Metadata } from 'next';
import HomeLandingPage from '@/components/marketing/HomeLandingPage';
import { marketingFontVariableClassName } from './marketing-fonts';
import './budr-landing.css';
import './budr-landing-longform.css';

export const metadata: Metadata = {
  title: 'BUDR — Driftssystem til socialpsykiatriske bosteder',
  description:
    'Det første danske driftssystem til socialpsykiatriske bosteder bygget på CHIME-rammeværket. Journal, vagtoverdragelse, recovery og borgerinddragelse i ét.',
  openGraph: {
    title: 'BUDR — Driftssystem til socialpsykiatriske bosteder',
    description:
      'Det første danske driftssystem til socialpsykiatriske bosteder bygget på CHIME-rammeværket. Journal, vagtoverdragelse, recovery og borgerinddragelse i ét.',
    url: 'https://budrcare.dk',
    siteName: 'BUDR',
    locale: 'da_DK',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BUDR — Driftssystem til socialpsykiatriske bosteder',
    description:
      'Det første danske driftssystem til socialpsykiatriske bosteder bygget på CHIME-rammeværket.',
  },
};

export default function HomePage() {
  return <HomeLandingPage className={marketingFontVariableClassName} />;
}

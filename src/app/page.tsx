import type { Metadata } from 'next';
import HomeLandingPage from '@/components/marketing/HomeLandingPage';
import { marketingFontVariableClassName } from './marketing-fonts';
import './budr-landing.css';
import './budr-landing-longform.css';

export const metadata: Metadata = {
  title: 'BUDR — Recovery-system til socialpsykiatriske bosteder',
  description:
    'Det første danske recovery-system bygget på CHIME-rammeværket. BUDR binder vagtoverdragelse, dokumentation og borgerens egen recovery sammen.',
  openGraph: {
    title: 'BUDR — Recovery-system til socialpsykiatriske bosteder',
    description:
      'Det første danske recovery-system bygget på CHIME-rammeværket. BUDR binder vagtoverdragelse, dokumentation og borgerens egen recovery sammen.',
    url: 'https://budrcare.dk',
    siteName: 'BUDR',
    locale: 'da_DK',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BUDR — Recovery-system til socialpsykiatriske bosteder',
    description: 'Det første danske recovery-system bygget på CHIME-rammeværket.',
  },
};

export default function HomePage() {
  return <HomeLandingPage className={marketingFontVariableClassName} />;
}

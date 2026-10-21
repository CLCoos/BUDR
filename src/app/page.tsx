import type { Metadata } from 'next';
import HomeLandingPage from '@/components/marketing/HomeLandingPage';
import { marketingFontVariableClassName } from './marketing-fonts';
import './budr-forside.css';

export const metadata: Metadata = {
  title: 'BUDR: Vagt, dokumentation og tilsyn til socialpsykiatriske bosteder',
  description:
    'BUDR guider personalet gennem vagten, skriver notaterne, mens I fortæller, og holder bostedet klar til tilsyn. Til socialpsykiatriske bosteder (§107 og §108).',
  openGraph: {
    title: 'BUDR: Vagt, dokumentation og tilsyn til socialpsykiatriske bosteder',
    description:
      'BUDR guider personalet gennem vagten, skriver notaterne, mens I fortæller, og holder bostedet klar til tilsyn. Til socialpsykiatriske bosteder (§107 og §108).',
    url: 'https://budrcare.dk',
    siteName: 'BUDR',
    locale: 'da_DK',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BUDR: Vagt, dokumentation og tilsyn til socialpsykiatriske bosteder',
    description:
      'Hver vagt ved, hvad der skal ske. Intet glipper. Til socialpsykiatriske bosteder.',
  },
};

export default function HomePage() {
  return <HomeLandingPage className={marketingFontVariableClassName} />;
}

import type { Metadata } from 'next';
import HomeLandingPage from '@/components/marketing/HomeLandingPage';
import { marketingFontVariableClassName } from './marketing-fonts';
import './budr-landing.css';
import './budr-landing-longform.css';

export const metadata: Metadata = {
  title: 'BUDR Care — Driftssystem til socialpsykiatriske botilbud',
  description:
    'Care Portal og Lys i ét system til socialpsykiatrien. Få stærkere overdragelse, klarere dokumentation og borgeren med i samme workflow.',
  openGraph: {
    title: 'BUDR Care — Ny standard for socialpsykiatrisk drift',
    description: 'BUDR Care samler Care Portal og borger-appen Lys i ét driftsflow til botilbud.',
  },
};

export default function HomePage() {
  return <HomeLandingPage className={marketingFontVariableClassName} />;
}

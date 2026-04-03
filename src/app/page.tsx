import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import HomeLanding from '@/components/marketing/HomeLanding';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-landing-body',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-landing-display',
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'BUDR Care — Portal til pædagoger og ledere i socialpsykiatrien',
  description:
    'Journalstøtte, medicinoverblik, samlet borgerprofil og borgerens egen stemme i Lys — så personalet kan prioritere nuet, og borgerne mødes med værdighed.',
  openGraph: {
    title: 'BUDR Care — til pædagoger og ledere i botilbud',
    description:
      'Care Portal og Lys: dokumentation, medicin og borgeroplysninger samlet — bygget til socialpsykiatrien.',
  },
};

export default function HomePage() {
  return <HomeLanding className={`${dmSans.variable} ${playfair.variable}`} />;
}

import React from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { DM_Sans, DM_Serif_Display } from 'next/font/google';
import AnalyticsGate from '@/components/AnalyticsGate';
import DemoGuidedTourProvider from '@/components/demo/DemoGuidedTourProvider';
import SonnerToaster from '@/components/SonnerToaster';
import BudrThemeProvider from '@/components/theme/BudrThemeProvider';
import { AuthenticatedUserProvider } from '@/contexts/AuthenticatedUserContext';
import './globals.css';

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://budrcare.dk').replace(
  /\/$/,
  ''
);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'BUDR Care — Portal og Lys til socialpsykiatrien',
  description:
    'Care Portal for pædagoger og ledere: overblik, journalstøtte og borgerdata. Lys giver borgeren stemme og tryghed — døgnet rundt.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'BUDR ApS',
  url: 'https://budrcare.dk',
  description:
    'Driftssystem til socialpsykiatriske bosteder i Danmark. Bygget på CHIME-rammeværket og VUM 2.0-kompatibelt.',
  founder: {
    '@type': 'Person',
    name: 'Christian Cloos',
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Aalborg',
    addressCountry: 'DK',
  },
  email: 'hej@budrcare.dk',
  sameAs: [] as string[],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da" className={`${dmSans.variable} ${dmSerifDisplay.variable}`}>
      <body>
        <Script
          id="budr-organization-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <BudrThemeProvider>
          <AuthenticatedUserProvider>
            <DemoGuidedTourProvider>
              <AnalyticsGate />
              {children}
              <SonnerToaster />
            </DemoGuidedTourProvider>
          </AuthenticatedUserProvider>
        </BudrThemeProvider>
      </body>
    </html>
  );
}

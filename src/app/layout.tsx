import React from 'react';
import type { Metadata, Viewport } from 'next';
import AnalyticsGate from '@/components/AnalyticsGate';
import SonnerToaster from '@/components/SonnerToaster';
import './globals.css';

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da" data-theme="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('budr-theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <AnalyticsGate />
        {children}
        <SonnerToaster />
      </body>
    </html>
  );
}

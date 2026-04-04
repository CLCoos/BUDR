import React from 'react';
import type { Metadata, Viewport } from 'next';
import SonnerToaster from '@/components/SonnerToaster';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'BUDR Care — Portal og Lys til socialpsykiatrien',
  description:
    'Care Portal for pædagoger og ledere: overblik, journalstøtte og borgerdata. Lys giver borgeren stemme og tryghed — døgnet rundt.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da">
      <body>
        {children}
        <SonnerToaster />
      </body>
    </html>
  );
}

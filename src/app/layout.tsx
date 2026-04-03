import React from 'react';
import type { Metadata, Viewport } from 'next';
import SonnerToaster from '@/components/SonnerToaster';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'BUDR — Dansk AI-livscoach til socialpsykiatrien',
  description:
    'BUDR hjælper beboere i socialpsykiatriske bosteder med daglig trivsel via PARK-metoden og giver personalet et komplet overblik.',
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

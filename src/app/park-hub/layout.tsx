import type { Metadata, Viewport } from 'next';
import '@/styles/park-flows.css';
import './lys-phone.css';

export const metadata: Metadata = {
  applicationName: 'BUDR Lys',
  appleWebApp: {
    capable: true,
    title: 'Lys',
    statusBarStyle: 'black-translucent',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#131920',
  width: 'device-width',
  initialScale: 1,
};

export default function ParkHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="budr-lys-root" className="budr-lys-root budr-lys-phone-frame antialiased">
      <div className="budr-lys-phone-column">{children}</div>
    </div>
  );
}

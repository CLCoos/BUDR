import type { Metadata, Viewport } from 'next';
import '../park-hub/lys-phone.css';

export const metadata: Metadata = {
  applicationName: 'BUDR Lys chat',
  appleWebApp: {
    capable: true,
    title: 'Lys chat',
    statusBarStyle: 'black-translucent',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#131920',
  width: 'device-width',
  initialScale: 1,
};

export default function LysChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="budr-lys-phone-frame min-h-dvh">
      <div className="budr-lys-phone-column">{children}</div>
    </div>
  );
}

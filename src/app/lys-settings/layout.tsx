import type { Metadata, Viewport } from 'next';
import '../park-hub/lys-phone.css';

export const metadata: Metadata = {
  applicationName: 'BUDR Lys',
  title: 'Lys — stemme',
};

export const viewport: Viewport = {
  themeColor: '#131920',
  width: 'device-width',
  initialScale: 1,
};

export default function LysSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="budr-lys-phone-frame min-h-dvh">
      <div className="budr-lys-phone-column">{children}</div>
    </div>
  );
}

import { DM_Sans, DM_Serif_Display } from 'next/font/google';
import '../budr-landing.css';

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

export default function ForBotilbudLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${dmSans.variable} ${dmSerifDisplay.variable}`.trim()}>{children}</div>;
}

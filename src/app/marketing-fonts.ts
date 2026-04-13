import { DM_Sans, DM_Serif_Display } from 'next/font/google';

/** Fælles marketing-fonte til `.budr-landing`-sider (institutioner, pilotpakke, for-botilbud). */
export const marketingDmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600'],
  variable: '--font-landing-body',
});

export const marketingDmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  display: 'swap',
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-budr-wordmark',
});

export const marketingFontVariableClassName =
  `${marketingDmSans.variable} ${marketingDmSerifDisplay.variable}`.trim();

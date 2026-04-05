'use client';

import Script from 'next/script';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

export function isValidGaMeasurementId(id: string | undefined): id is string {
  if (!id) return false;
  if (id.includes('your-google') || id.includes('placeholder')) return false;
  return /^G-[A-Z0-9]+$/i.test(id);
}

/** GA4 tags — kun efter udtrykkeligt samtykke (eller bypass i miljø). */
export default function Ga4Scripts() {
  if (!isValidGaMeasurementId(GA_ID)) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="budr-ga4-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: true });
`}
      </Script>
    </>
  );
}

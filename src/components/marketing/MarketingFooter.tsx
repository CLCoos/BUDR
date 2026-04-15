import Link from 'next/link';
import { BudrLogo } from '@/components/brand/BudrLogo';

export default function MarketingFooter() {
  return (
    <footer>
      <div className="footer-grid shell">
        <div>
          <div className="footer-logo">
            <BudrLogo dark size={36} />
          </div>
          <p className="footer-desc">
            Portal til personalet. Lys til borgeren. Udviklet til socialpsykiatri og botilbud.
          </p>
          <a href="mailto:hej@budrcare.dk" className="footer-mail">
            hej@budrcare.dk
          </a>
        </div>
        <div className="footer-col">
          <h5>Produkter</h5>
          <Link href="/care-portal-demo">Care Portal demo</Link>
          <Link href="/app">Lys borger-app</Link>
          <Link href="/pilotpakke">Pilotpakke</Link>
        </div>
        <div className="footer-col">
          <h5>Information</h5>
          <Link href="/institutioner">Til institutioner</Link>
          <Link href="/for-botilbud/journal-og-digital-tilsyn">Journal &amp; digitalt tilsyn</Link>
          <Link href="/for-botilbud/varsling-socialpsykiatri">Varsling socialpsykiatri</Link>
          <Link href="/for-botilbud/plan-og-medicinoverblik">Plan &amp; medicinvisning</Link>
          <a href="https://www.linkedin.com/company/budr" target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
        </div>
        <div className="footer-col">
          <h5>Juridisk</h5>
          <Link href="/privacy">Privatlivspolitik</Link>
          <Link href="/cookies">Cookiepolitik</Link>
          <Link href="/terms">Vilkår</Link>
        </div>
      </div>
      <div className="footer-bottom shell">
        <span>© {new Date().getFullYear()} BUDR ApS · Aalborg, Danmark</span>
      </div>
    </footer>
  );
}

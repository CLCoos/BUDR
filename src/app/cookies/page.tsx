import type { Metadata } from 'next';
import LegalPageShell from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Cookiepolitik | BUDR',
  description: 'Information om cookies og lokal lagring på BUDR.',
};

export default function CookiesPage() {
  return (
    <LegalPageShell title="Cookies og lokal lagring">
      <section>
        <h2>Nødvendige cookies</h2>
        <p>
          BUDR bruger teknisk nødvendige cookies og tilsvarende lagring for at holde dig logget ind
          (fx Supabase Auth-session for personale, sessionsmarkører for borger-flows) og for at
          sikre platformen mod misbrug. Disse kan ikke fravælges, hvis du vil bruge de beskyttede
          dele af tjenesten.
        </p>

        <h2>Funktionelle og præference-cookies</h2>
        <p>
          Visse demo-sider kan bruge lokal lagring i browseren til at vise eksempeldata. Det er ikke
          markedsføringscookies.
        </p>

        <h2>Tredjeparter</h2>
        <p>
          Vi anvender ikke annonce-cookies fra tredjeparter på kerneproduktet. Eventuelle
          analyseværktøjer skal fremgå af jeres organisations samtykke- eller informeringsmateriale,
          hvis de tilføjes senere.
        </p>

        <h2>Kontakt</h2>
        <p>
          Spørgsmål: <a href="mailto:hej@budrcare.dk">hej@budrcare.dk</a>
        </p>
      </section>
    </LegalPageShell>
  );
}

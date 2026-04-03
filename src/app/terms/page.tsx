import type { Metadata } from 'next';
import LegalPageShell from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Vilkår for brug | BUDR',
  description: 'Vilkår, ansvar og dokumentation ved brug af BUDR.',
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Vilkår for brug">
      <section>
        <h2>Anvendelse</h2>
        <p>
          BUDR stilles til rådighed som et digitalt værktøj til understøttelse af pædagogisk praksis
          og trivsel i socialpsykiatrien. Løsningen erstatter ikke faglig vurdering, journalpligt,
          magtanvendelsesregler eller myndighedskrav. Personalet forbliver ansvarligt for at
          overholde gældende lov, herunder serviceloven og dokumentationskrav i egen organisation.
        </p>

        <h2>Dokumentation og serviceloven</h2>
        <p>
          Funktioner til strukturering af indsats- og magtdokumentation (herunder skabeloner der
          refererer til bestemmelser i serviceloven) er et hjælpemiddel. Den endelige juridiske
          vurdering, indhold i journalen og indberetning til kommune eller anden myndighed påhviler
          altid den registrerende institution og det ansvarlige personale. BUDR garanterer ikke
          godkendelse af konkret dokumentation af myndigheder.
        </p>

        <h2>AI-funktioner</h2>
        <p>
          Hvor produktet anvender kunstig intelligens (fx tekstforslag), skal output kontrolleres af
          mennesker før brug i journal eller over for borgere. AI må ikke træffe selvstændige
          beslutninger om behandling eller tvang.
        </p>

        <h2>Adgang og sikkerhed</h2>
        <p>
          Organisationer skal sikre korrekt adgangsstyring (fx tildeling af <code>org_id</code> til
          personalekonti) og interne instrukser. Brug af demo-miljøer med simulerede data må ikke
          forveksles med produktionsdata.
        </p>

        <h2>Kontakt</h2>
        <p>
          <a href="mailto:hej@budrcare.dk">hej@budrcare.dk</a>
        </p>
      </section>
    </LegalPageShell>
  );
}

import type { Metadata } from 'next';
import LegalPageShell from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Privatlivspolitik | BUDR',
  description: 'Hvordan BUDR behandler personoplysninger i overensstemmelse med GDPR.',
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privatlivspolitik">
      <section>
        <h2>Dataansvarlig</h2>
        <p>
          BUDR (herefter &quot;vi&quot;) er dataansvarlig for behandlingen af personoplysninger i
          forbindelse med brug af BUDR-løsningen (borger-app, Care Portal og tilhørende websider),
          medmindre andet er skriftligt aftalt med jeres organisation (fx kommune eller botilbud).
          Ved institutionsaftaler kan organisationen være selvstændig dataansvarlig eller
          meddataansvarlig — det fremgår altid af den indgåede databehandleraftale.
        </p>

        <h2>Formål og retsgrundlag</h2>
        <p>Vi behandler oplysninger for at:</p>
        <ul>
          <li>levere og forbedre trivsels- og dokumentationsfunktioner til socialpsykiatrien;</li>
          <li>autentificere borgere og personale;</li>
          <li>
            overholde lovkrav, herunder dokumentations- og sikkerhedskrav efter aftale med jer.
          </li>
        </ul>
        <p>
          Retsgrundlaget er typisk GDPR art. 6 stk. 1 litra b (kontraktopfyldelse), litra c
          (retsforpligtelse) og/eller litra f (berettiget interesse i sikker drift), samt art. 9
          hvor der behandles helbredsoplysninger — her kræves særskilt hjemmel i dansk ret (fx
          sundhedsloven, serviceloven) og interne retningslinjer hos den dataansvarlige
          organisation.
        </p>

        <h2>Kategorier af oplysninger</h2>
        <p>
          Afhængigt af produktets brug kan der behandles identifikationsoplysninger,
          kontaktoplysninger, stemnings- og aktivitetsdata, journalnotater, beskeder mellem borger
          og personale, tekniske logfiler og sikkerhedshændelseslog. Indhold og omfang defineres i
          jeres databehandleraftale og risikovurdering.
        </p>

        <h2>Modtagere og underdatabehandlere</h2>
        <p>
          Drift kan ske hos godkendte underdatabehandlere (fx hosting- og databaseleverandører inden
          for EU/EØS). Liste over underdatabehandlere kan rekvireres på{' '}
          <a href="mailto:hej@budrcare.dk">hej@budrcare.dk</a>. Hvis AI-funktioner anvendes, skal
          formål, modelleverandør og databehandlergrundlag være beskrevet i den aktuelle
          databehandleraftale.
        </p>

        <h2>Opbevaring</h2>
        <p>
          Oplysninger opbevares så længe, det er nødvendigt for formålet eller efter krav i lov
          eller dokumentationspligt hos den dataansvarlige organisation. Sletningsrutiner aftales
          med den dataansvarlige.
        </p>

        <h2>Dine rettigheder</h2>
        <p>
          Som registreret har du efter GDPR ret til indsigt, berigtigelse, sletning, begrænsning,
          dataportabilitet og indsigelse. Henvendelser rettes til den dataansvarlige organisation,
          der har ansvaret over for borgeren, eller til os som databehandler via ovenstående e-mail,
          afhængigt af rollen i den konkrete sag.
        </p>

        <h2>Klagemulighed</h2>
        <p>
          Du kan klage til Datatilsynet (<a href="https://www.datatilsynet.dk">datatilsynet.dk</a>).
        </p>
      </section>
    </LegalPageShell>
  );
}

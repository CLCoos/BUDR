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
          Vi bruger disse underdatabehandlere. Ikke alle ligger i EU/EØS, og vi skriver ærligt, hvor
          data behandles:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> (database og login): data gemmes i EU (Stockholm, Sverige).
          </li>
          <li>
            <strong>Netlify</strong> (hosting af websitet og serverfunktioner): serverfunktionerne
            kører i EU (Frankfurt, Tyskland). Netlify er en amerikansk virksomhed.
          </li>
          <li>
            <strong>Anthropic</strong> (AI-forslag, fx udkast til notater og dokumenter): behandles
            i dag i USA. Vi er i gang med at flytte AI-behandlingen til EU (Amazon Web Services,
            Frankfurt).
          </li>
          <li>
            <strong>OpenAI</strong> (tale til tekst i borger-appen Lys, når borgeren bruger
            mikrofonen): behandles i USA.
          </li>
          <li>
            <strong>ElevenLabs</strong> (oplæsning af tekst i Lys): behandles i USA.
          </li>
          <li>
            <strong>Sentry</strong> (fejlovervågning, så vi kan rette tekniske fejl): behandles i
            USA.
          </li>
        </ul>
        <p>
          Overførsel til USA sker på grundlag af EU-Kommissionens standardkontraktbestemmelser
          og/eller EU-US Data Privacy Framework. AI-forslag gemmes aldrig, før en medarbejder har
          godkendt dem. Den fulde liste og aftalegrundlaget fremgår af databehandleraftalen og kan
          rekvireres på <a href="mailto:hej@budrcare.dk">hej@budrcare.dk</a>.
        </p>

        <h2>Kontaktformular på websitet</h2>
        <p>
          Når du udfylder kontaktformularen (navn, institution, rolle og besked), behandler vi
          oplysningerne til at besvare henvendelsen og følge op på demo, pilot eller partnerskab.
          Behandlingen sker som dataansvarlig (BUDR Care v/ Christian Cloos) med hjemmel i GDPR art.
          6 stk. 1 litra b (forberedelse til aftale) og/eller litra f (berettiget interesse i at
          besvare henvendelser). Oplysningerne gemmes i vores database (Supabase) med teknisk adgang
          begrænset til BUDR; de slettes eller anonymiseres, når samtalen er afsluttet eller efter
          en rimelig frist, medmindre der indgås aftale, der kræver længere opbevaring.
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

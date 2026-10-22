import { initialerAfNavn, namePartsFor } from '@/lib/ai/aliases';
import { replaceNames } from '@/lib/assistant/names';
import { eksemplerTekst, medGrundlag, type Eksempel } from '@/lib/ai/faglighed/grundlag';

/** Overskrifterne i et forbedret journalnotat. */
export const JOURNAL_POLISH_HEADINGS = ['Handling/aktivitet', 'Refleksion'] as const;

const REGLER = `Du redigerer rånotater, som pædagoger på et socialpsykiatrisk bosted har skrevet under eller efter en vagt. Journalen læses af kolleger og kan blive læst af borgeren og kommunen.

Dit job er at redigere, ikke at omskrive. Du må ikke ændre betydning, tone, intensitet eller faglige vurderinger.

STRUKTUR
Svaret har altid præcis disse to overskrifter på hver sin linje (uden markdown og uden **):
Handling/aktivitet
Refleksion

Handling/aktivitet: alt, hvad der skete, i rækkefølge. Hvert faktum fra rånotatet skal med: handlinger, tidspunkter, tal, hvem der gjorde hvad, og borgerens ord.
Refleksion: kun den refleksion, der står i rånotatet, kort (højst 3-4 sætninger). Refleksion er personalets egne overvejelser, tvivl og tanker om, hvad der bør ske, også når de står sidst i en sætning om noget andet (fx "jeg er usikker på, om vi skal …", "det er 3. gang på 2 uger"). Flyt dem til Refleksion med tal og forbehold bevaret. Bevar ord som "måske", "sandsynligvis" og "det virker som om".
Står der ingen refleksion i rånotatet, så skriv én linje under Refleksion: "[Forslag til refleksion: …]" med ét kort, åbent spørgsmål, der udspringer direkte af det skrevne. Personalet afgør, om det skal stå. Skriv aldrig en refleksion, som om personalet selv havde tænkt den.

SPROG
- Ret stavefejl, grammatik og tegnsætning. Skriv flydende dansk med variation i sætningerne og præcise verber ("afviser" frem for "siger nej til"), men uden at ændre betydningen.
- Følg Retskrivningsordbogen. Opfind ikke nye fagord eller sammensætninger; er rånotatet uklart, så omskriv til almindeligt dansk, alle forstår.
- Bevar "UT" (den medarbejder, der skriver), borgerens initialer præcis som skrevet og farvekoder (grøn/gul/rød).
- Borgere skrives altid med initialer, aldrig med navn (GDPR). Står et navn i rånotatet, så skriv borgerens initialer fra "Beboer" eller forbogstaverne i navnet.

FORBUDT
- At fjerne eller sammenfatte faktuelle observationer i Handling/aktivitet.
- At gøre følelser neutrale ("meget vred" bliver ikke til "frustreret").
- At tilføje vurderinger, anbefalinger, årsager eller handlingsanvisninger, der ikke står i rånotatet.

SVAR: Kun det redigerede notat.`;

const EKSEMPLER: Eksempel[] = [
  {
    input: `Kategori: Dagligdag
Beboer (kun kontekst): KBJ

---

KBJ kom ned kl 9.30 og var meget vred over at hans kaffe var væk. råbte af UT og smækkede med døren. UT gav ham plads og efter 10 min kom han selv tilbage og sagde undskyld. vi drak kaffe sammen og snakkede om hans weekend hos søsteren`,
    output: `Handling/aktivitet
KBJ kom ned kl. 9.30 og var meget vred over, at hans kaffe var væk. Han råbte af UT og smækkede med døren. UT gav ham plads, og efter 10 minutter kom KBJ selv tilbage og sagde undskyld. Bagefter drak UT og KBJ kaffe sammen og talte om hans weekend hos søsteren.

Refleksion
[Forslag til refleksion: Hvad hjalp KBJ til selv at komme tilbage og sige undskyld?]`,
  },
  {
    input: `Kategori: Medicin
Beboer (kun kontekst): AL

---

AL ville ikke tage morgenmedicin, sagde "den gør mig så træt". UT noterede det og sagde hun kan snakke m lægen torsdag. Hun tog den kl 11 efter frokost. måske er det tidspunktet der er svært, hun virker tit træt om formiddagen`,
    output: `Handling/aktivitet
AL afviste sin morgenmedicin og sagde: "Den gør mig så træt." UT noterede det og fortalte AL, at hun kan tale med lægen torsdag. AL tog medicinen kl. 11 efter frokost.

Refleksion
Måske er tidspunktet svært for AL, da hun ofte virker træt om formiddagen.`,
  },
];

const SYSTEM = medGrundlag(`${REGLER}\n\nSådan ser gode svar ud:\n\n${eksemplerTekst(EKSEMPLER)}`);

export type JournalPolishInput = { draft: string; category?: string; residentLabel?: string };

/** Systeminstruks, brugerbesked og indstillinger til journalforbedring. Bruges af ruten og testsættet. */
export function buildJournalPolishRequest(input: JournalPolishInput) {
  // Klienten sender ofte borgerens navn; AI'en får kun initialerne, og navnet skiftes ud i teksten.
  const label = input.residentLabel?.trim() ?? '';
  const initials = label ? initialerAfNavn(label) : '';
  const extra = [
    input.category ? `Kategori: ${input.category}` : null,
    initials ? `Beboer (kun kontekst): ${initials}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  const draft =
    label && initials && label !== initials
      ? replaceNames(input.draft.trim(), namePartsFor(label), initials)
      : input.draft.trim();
  return {
    system: SYSTEM,
    userMessage: extra ? `${extra}\n\n---\n\n${draft}` : draft,
    maxTokens: 1200,
    temperature: 0.2,
  };
}

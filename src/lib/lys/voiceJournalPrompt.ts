/**
 * Stemmedagbog: borgerens talte fortælling bliver til (1) et fagligt journaludkast til personalet
 * og (2) borgerens egen fortælling, let renset. Bruges af ruten og testsættet.
 */
import { medGrundlag } from '@/lib/ai/faglighed/grundlag';

export const VOICE_JOURNAL_SYSTEM = medGrundlag(`
Din opgave er at producere TO outputs fra en beboers talte fortælling — i samme svar, som JSON.

OUTPUT 1 — CHIME-struktureret journalnotat:
Strukturér beboerens fortælling som et fagligt journalnotat med fem sektioner. Skriv i tredje person om "borgeren", fagligt men menneskeligt. Brug recovery-orienteret sprog. Ingen kognitiv-terapeutiske begreber.

Sektionerne er:
- Forbundethed: hvem talte beboeren om, hvem var støtte, hvor følte de tilhør
- Håb: drømme, ønsker, ting beboeren ser frem til
- Identitet: styrker, stoltheder, det beboeren er god til, det de kan lide
- Mening: værdier, hvad der betyder noget, formål
- Handlekraft: beslutninger beboeren har taget, ting de selv har klaret

Hvis en sektion ikke har indhold fra fortællingen, skriv "Ikke nævnt i denne fortælling."

OUTPUT 2 — Bevaret recovery story:
Bevar beboerens egne ord. Du må KUN:
- Fjerne udfyldningsord ("øh", "altså", "ligesom")
- Rette åbenlyse transkriptionsfejl
- Ordne i sætninger med tegnsætning
- Bevare beboerens stemme, ordvalg, syntaks

Du må IKKE:
- Omformulere
- Strukturere efter temaer
- Tilføje ord beboeren ikke sagde
- Ændre stemme fra første person

Returner KUN dette JSON-format, intet andet:
{
  "journal_note": "Det fagligt strukturerede CHIME-notat i tredje person, max 400 ord",
  "recovery_story": "Beboerens bevarede fortælling i første person, let renset"
}`);

/**
 * "Saml dagens notater": flere korte kladder om én borger bliver til ét journalnotat om aftenen.
 * Bruges af ruten og testsættet. AI'en ser "Borger 1" og ingen personalenavne.
 */
import { residentAliasMap } from '@/lib/ai/aliases';
import { medGrundlag } from '@/lib/ai/faglighed/grundlag';
import type { ResidentNameRow } from '@/lib/assistant/names';
import { JOURNAL_POLISH_HEADINGS } from './polishPrompt';

const SYSTEM =
  medGrundlag(`Personalet har skrevet flere korte, uformelle notater i løbet af dagen om samme borger. Saml dem til ét sammenhængende journalnotat, som skrives om aftenen til dokumentation og overlevering.

- Svar kun med det færdige notat: ingen hilsen, ingen forklaring.
- Brug præcis disse to overskrifter på hver sin linje: "${JOURNAL_POLISH_HEADINGS[0]}" og "${JOURNAL_POLISH_HEADINGS[1]}".
- ${JOURNAL_POLISH_HEADINGS[0]}: hvad skete der, i tidsrækkefølge, med klokkeslæt, når de står i notaterne. Alt, hvad der står i notaterne, skal med; fjern kun gentagelser og talesprog.
- ${JOURNAL_POLISH_HEADINGS[1]}: personalets faglige overvejelser, som de står i notaterne, og næste skridt, hvis de er nævnt. Er der ingen overvejelser i notaterne, så skriv "[Udfyldes af personalet: faglig refleksion]".
- Siger to notater noget forskelligt, så skriv begge dele, og nævn at de afviger.
- Borgeren hedder "Borger 1" i notaterne. Skriv "borgeren" eller "Borger 1".
- Notatets længde følger kilderne: kort, når der er lidt.`);

export type DaySynthesisNote = { time: string; category: string; text: string };

export function buildDaySynthesisRequest(input: {
  resident: ResidentNameRow;
  notes: DaySynthesisNote[];
}) {
  const aliases = residentAliasMap([input.resident]);
  const userMessage = input.notes
    .map(
      (n, i) => `### Notat ${i + 1} (kl. ${n.time}, ${n.category})\n${aliases.hide(n.text.trim())}`
    )
    .join('\n\n---\n\n');
  return {
    request: { system: SYSTEM, userMessage, maxTokens: 2200, temperature: 0.2 },
    restore: aliases.restore,
  };
}

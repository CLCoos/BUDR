/**
 * Lys' korte svar, når borgeren har skrevet i sin dagbog. Bruges af ruten og testsættet.
 */
import { clipText } from '@/lib/ai/aliases';
import { medLysPersona } from './persona';

const SYSTEM =
  medLysPersona(`Borgeren har lige skrevet i sin dagbog. Skriv én kort, oprigtig kommentar til det, borgeren skrev.
- Højst 2 sætninger og 35 ord.
- Spejl konkret det, borgeren skrev ("Du var med til fællesspisning igen"). Undgå tomme vendinger som "Det er bare sådan nogle dage".
- Hold dig til det, der står i dagens indlæg. Nævn kun et mønster fra de seneste indlæg, hvis det tydeligt står der, og sig det stille.
- Stil ikke spørgsmål, der kræver svar. Borgeren skal ikke føle, at de skal skrive mere.
- Er indlægget meget kort eller neutralt (fx "Regn i dag."), så anerkend kort det, der står. Gør det ikke til en følelse, og ønsk ikke noget for borgeren.
- Ved tegn på krise gælder krisereglerne, og du må bruge 3 sætninger: anerkend følelsen, sig at personalet er der nu (gå ud og find en af dem eller ring på vagtklokken), og skriv altid nummeret til Livslinien, 70 201 201.`);

export type LysJournalReplyInput = {
  content?: unknown;
  mood?: unknown;
  phase?: unknown;
  history?: unknown;
};

export function buildLysJournalReplyRequest(input: LysJournalReplyInput) {
  const content = clipText(input.content, 600);
  const history = Array.isArray(input.history)
    ? input.history
        .slice(0, 3)
        .map((h) => clipText(h, 120))
        .filter(Boolean)
    : [];
  const userMessage = `Stemning: ${clipText(input.mood, 30) || 'ikke valgt'}. Tidspunkt: ${clipText(input.phase, 30) || 'ukendt'}.${
    history.length ? `\n\nSeneste indlæg:\n${history.join('\n')}` : ''
  }\n\nDagens indlæg: "${content}"`;
  return { content, system: SYSTEM, userMessage, maxTokens: 150, temperature: 0.5 };
}
